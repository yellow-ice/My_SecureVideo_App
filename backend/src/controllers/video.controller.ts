import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import type { AuthRequest } from '../middlewares/auth.middleware';

export const getVideos = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);
  const q = String(req.query.q ?? '');
  const category = String(req.query.category ?? '');
  const where = {
    status: 'published' as const,
    title: { contains: q },
    ...(category ? { category } : {})
  };
  const [items, total] = await Promise.all([
    prisma.video.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { comments: true } }
      }
    }),
    prisma.video.count({ where })
  ]);
  res.json({ items, total, page, pageSize });
};

export const getVideoById = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) {
    res.status(404).json({ message: 'Video not found' });
    return;
  }
  // 观看计数（演示环境：直接自增）
  await prisma.video.update({ where: { id }, data: { views: { increment: 1 } } });
  res.json({ video });
};

export const uploadVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, url, cover_url, category, duration } = req.body;
  const categorySlug = String(category ?? '').trim();
  const categoryItem = await prisma.category.findFirst({ where: { slug: categorySlug, status: 'approved' }, select: { slug: true } });
  if (!categoryItem) {
    res.status(400).json({ message: 'Category not found' });
    return;
  }
  const video = await prisma.video.create({
    data: {
      title,
      description,
      url,
      cover_url,
      category: categoryItem.slug,
      duration: Number(duration),
      user_id: req.user!.id,
      status: 'published'
    }
  });
  await prisma.systemLog.create({
    data: { level: 'info', module: 'video', message: `upload video ${video.id}`, user_id: req.user!.id, ip_address: req.ip }
  });
  res.status(201).json({ video });
};

export const uploadFile = async (req: AuthRequest, res: Response): Promise<void> => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) {
    res.status(400).json({ message: 'Missing file' });
    return;
  }
  const kind = String(req.query.kind ?? 'video');
  const base = kind === 'cover' ? '/uploads/covers/' : '/uploads/videos/';
  res.json({ url: `http://localhost:3000${base}${file.filename}` });
};

export const getComments = async (req: Request, res: Response): Promise<void> => {
  const videoId = Number(req.params.id);
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const where = { video_id: videoId, parent_id: null as number | null };
  const [items, totalRoot, totalAll] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, username: true, avatar: true, role: true, status: true } },
        replies: {
          orderBy: { created_at: 'asc' },
          include: {
            user: { select: { id: true, username: true, avatar: true, role: true, status: true } },
            replyToUser: { select: { id: true, username: true, role: true, status: true } }
          }
        }
      }
    }),
    prisma.comment.count({ where }),
    prisma.comment.count({ where: { video_id: videoId } })
  ]);
  const normalizeUser = (u: { id: number; username: string; avatar: string | null; role: 'admin' | 'user'; status: 'active' | 'suspended' }) =>
    u.status === 'active'
      ? { id: u.id, username: u.username, avatar: u.avatar, role: u.role, status: 'active' as const }
      : { id: u.id, username: '该用户已注销', avatar: null, role: u.role, status: 'suspended' as const };
  const safeItems = items.map((item) => ({
    ...item,
    user: normalizeUser(item.user),
    replies: item.replies.map((r) => ({
      ...r,
      user: normalizeUser(r.user),
      replyToUser: r.replyToUser ? normalizeUser(r.replyToUser as any) : null
    }))
  }));
  res.json({ items: safeItems, total: totalAll, totalRoot, page, pageSize });
};

export const postComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const videoId = Number(req.params.id);
  const content = String((req.body?.content ?? '')).trim();
  const parentIdRaw = req.body?.parent_id;
  const parentId = Number.isFinite(Number(parentIdRaw)) ? Number(parentIdRaw) : undefined;
  const replyToUserIdRaw = req.body?.reply_to_user_id;
  const replyToUserId = Number.isFinite(Number(replyToUserIdRaw)) ? Number(replyToUserIdRaw) : undefined;
  if (!content || content.length < 1 || content.length > 1000) {
    res.status(400).json({ message: 'Invalid content' });
    return;
  }
  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { parent_id: true, video_id: true } });
    if (!parent || parent.video_id !== videoId || parent.parent_id) {
      res.status(400).json({ message: '只支持一级评论下回复' });
      return;
    }
  }
  const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { status: true } });
  if (!me || me.status !== 'active') {
    res.status(403).json({ message: 'Account suspended' });
    return;
  }
  const created = await prisma.comment.create({
    data: {
      video_id: videoId,
      user_id: req.user!.id,
      content,
      parent_id: parentId,
      reply_to_user_id: replyToUserId
    }
  });
  const actor = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { username: true } });
  if (replyToUserId && replyToUserId !== req.user!.id) {
    await prisma.notification.create({
      data: {
        user_id: replyToUserId,
        type: 'reply',
        title: '你收到一条回复',
        body: `${actor?.username ?? '有人'} 回复了你`,
        related_type: 'video_comment',
        related_id: created.id
      }
    });
  }
  const mentionNames = Array.from(
    new Set((content.match(/@([a-zA-Z0-9_\u4e00-\u9fa5-]{1,32})/g) ?? []).map((m) => m.slice(1)))
  );
  if (mentionNames.length) {
    const mentionUsers = await prisma.user.findMany({
      where: { username: { in: mentionNames }, id: { not: req.user!.id } },
      select: { id: true }
    });
    if (mentionUsers.length) {
      await prisma.notification.createMany({
        data: mentionUsers.map((u) => ({
          user_id: u.id,
          type: 'mention',
          title: '你被提及了',
          body: `${actor?.username ?? '有人'} 在评论中提到了你`,
          related_type: 'video_comment',
          related_id: created.id
        }))
      });
    }
  }
  res.status(201).json({ comment: created });
};

export const deleteVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const old = await prisma.video.findUnique({ where: { id } });
  if (!old) {
    res.status(404).json({ message: 'Video not found' });
    return;
  }
  if (req.user!.role !== 'admin' && old.user_id !== req.user!.id) {
    res.status(403).json({ message: 'Not allowed' });
    return;
  }
  await prisma.video.delete({ where: { id } });
  await prisma.systemLog.create({
    data: { level: 'warn', module: 'video', message: `delete video ${id}`, user_id: req.user!.id, ip_address: req.ip }
  });
  res.json({ success: true });
};
