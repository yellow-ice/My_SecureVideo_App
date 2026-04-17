import { Response } from 'express';
import { prisma } from '../config/prisma';
import type { AuthRequest } from '../middlewares/auth.middleware';

/** 管理端投稿列表：筛选/排序/计数对齐创作中心思路，便于审核排期与检索 */
export const adminListContents = async (req: AuthRequest, res: Response): Promise<void> => {
  const rawStatus = String(req.query.status ?? 'pending').trim().toLowerCase();
  const status: 'pending' | 'published' | 'rejected' | 'all' =
    rawStatus === 'all'
      ? 'all'
      : ['pending', 'published', 'rejected'].includes(rawStatus)
        ? (rawStatus as 'pending' | 'published' | 'rejected')
        : 'pending';

  const typeRaw = String(req.query.type ?? '').trim();
  const type =
    typeRaw === 'video' || typeRaw === 'image' || typeRaw === 'article'
      ? (typeRaw as 'video' | 'image' | 'article')
      : null;

  const q = String(req.query.q ?? '').trim();
  const sortRaw = String(req.query.sort ?? 'updated').trim().toLowerCase();
  const sort = sortRaw === 'created' ? 'created' : 'updated';

  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));

  const searchOr = q
    ? {
        OR: [
          { title: { contains: q } },
          { summary: { contains: q } },
          { body: { contains: q } },
          { reject_reason: { contains: q } },
          { category: { name: { contains: q } } },
          { author: { username: { contains: q } } },
          { author: { email: { contains: q } } }
        ]
      }
    : {};

  const typeWhere = type ? { type } : {};
  const baseWhere = { ...typeWhere, ...searchOr };
  const statusWhere = status === 'all' ? {} : { status };
  const where = { ...baseWhere, ...statusWhere };

  const orderBy =
    sort === 'created' ? [{ created_at: 'desc' as const }] : [{ updated_at: 'desc' as const }];

  const [items, total, groupRows] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, username: true, email: true } },
        _count: { select: { likes: true, comments: true } }
      }
    }),
    prisma.content.count({ where }),
    prisma.content.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { _all: true }
    })
  ]);

  const counts = { pending: 0, published: 0, rejected: 0 };
  for (const row of groupRows) {
    const n = row._count._all;
    if (row.status === 'pending') counts.pending = n;
    else if (row.status === 'published') counts.published = n;
    else if (row.status === 'rejected') counts.rejected = n;
  }

  res.json({ items, total, page, pageSize, counts });
};

export const adminReviewContent = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const action = String(req.body?.action ?? '').toLowerCase();
  const reviewerId = req.user?.id;
  const rejectReason = String(req.body?.reject_reason ?? req.body?.rejectReason ?? '').trim();

  if (!reviewerId || !Number.isFinite(id) || !['published', 'rejected'].includes(action)) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }

  const current = await prisma.content.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!current) {
    res.status(404).json({ message: 'Content not found' });
    return;
  }

  const nextStatus = action === 'published' ? 'published' : 'rejected';
  if (nextStatus === 'rejected' && rejectReason.length > 120) {
    res.status(400).json({ message: 'Reject reason too long' });
    return;
  }

  const item = await prisma.content.update({
    where: { id },
    data: {
      status: nextStatus,
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
      reject_reason: nextStatus === 'rejected' ? (rejectReason || '不符合规范') : null
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      author: { select: { id: true, username: true, email: true } }
    }
  });

  res.json({ item });
};

