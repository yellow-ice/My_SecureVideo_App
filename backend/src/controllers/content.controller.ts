import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import type { AuthRequest } from '../middlewares/auth.middleware';

const extractMentions = (text: string): string[] => {
  const names = text.match(/@([a-zA-Z0-9_\u4e00-\u9fa5-]{1,32})/g) ?? [];
  return Array.from(new Set(names.map((m) => m.slice(1))));
};

const tagSlugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const normalizeTagsInput = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  const names = raw
    .map((x) => String(x ?? '').trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((x) => x.slice(0, 24));
  return Array.from(new Set(names));
};

const connectTags = async (contentId: number, tagNames: string[]) => {
  if (!tagNames.length) return;
  const tags = [] as Array<{ id: number }>;
  for (const name of tagNames) {
    const slug = tagSlugify(name);
    if (!slug) continue;
    // eslint-disable-next-line no-await-in-loop
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
      select: { id: true }
    });
    tags.push(tag);
  }
  if (!tags.length) return;
  await prisma.contentTag.createMany({
    data: tags.map((t) => ({ content_id: contentId, tag_id: t.id })),
    skipDuplicates: true
  });
};

const ensureDefaultFolder = async (userId: number) => {
  const existing = await prisma.favoriteFolder.findFirst({
    where: { user_id: userId, is_default: true },
    select: { id: true }
  });
  if (existing) return existing;
  return prisma.favoriteFolder.create({
    data: { user_id: userId, name: '默认收藏夹', is_default: true },
    select: { id: true }
  });
};

const ensureLegacyVideosSynced = async (): Promise<void> => {
  const approved = await prisma.category.findMany({ where: { status: 'approved' }, select: { id: true, slug: true } });
  if (!approved.length) return;
  const catMap = new Map(approved.map((c) => [c.slug, c.id]));
  const fallbackCat = approved[0]!.id;
  const legacyVideos = await prisma.video.findMany({
    where: { status: 'published' },
    select: { id: true, title: true, description: true, cover_url: true, url: true, category: true, user_id: true, views: true, created_at: true }
  });
  for (const v of legacyVideos) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await prisma.content.findFirst({
      where: { type: 'video', media_url: v.url, author_id: v.user_id },
      select: { id: true }
    });
    if (exists) continue;
    // eslint-disable-next-line no-await-in-loop
    await prisma.content.create({
      data: {
        type: 'video',
        title: v.title,
        summary: v.description ?? undefined,
        cover_url: v.cover_url ?? undefined,
        media_url: v.url,
        category_id: catMap.get(v.category) ?? fallbackCat,
        author_id: v.user_id,
        views: v.views,
        created_at: v.created_at
      }
    });
  }
};

const FIXED_CATEGORY_SLUGS = new Set(['default', 'tech', 'game', 'ent', 'knowledge', 'life', 'movie', 'music', 'anime', 'sport', 'fashion']);

const ensureDefaultCategory = async (): Promise<number> => {
  const existing = await prisma.category.findFirst({
    where: { slug: 'default', status: 'approved' },
    select: { id: true }
  });
  if (existing) return existing.id;
  const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } });
  const ownerId = admin?.id ?? 1;
  const created = await prisma.category.create({
    data: {
      name: '默认',
      slug: 'default',
      description: '系统默认分区',
      status: 'approved',
      creator_id: ownerId,
      reviewed_by: admin?.id ?? null,
      reviewed_at: new Date(),
      request_count: 0
    },
    select: { id: true }
  });
  return created.id;
};

const resolveCategoryId = async (categorySlugRaw: string): Promise<number> => {
  const categorySlug = String(categorySlugRaw ?? '').trim();
  if (categorySlug && FIXED_CATEGORY_SLUGS.has(categorySlug)) {
    const category = await prisma.category.findFirst({
      where: { slug: categorySlug, status: 'approved' },
      select: { id: true }
    });
    if (category) return category.id;
  }
  return ensureDefaultCategory();
};

export const listContents = async (req: AuthRequest, res: Response): Promise<void> => {
  await ensureLegacyVideosSynced();
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const q = String(req.query.q ?? '').trim();
  const type = String(req.query.type ?? '').trim();
  const category = String(req.query.category ?? '').trim();
  const sort = String(req.query.sort ?? 'latest');
  const terms = q
    .replace(/[#＃]/g, ' ')
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  const searchOr = [
    ...(q ? [{ title: { contains: q } }, { summary: { contains: q } }, { body: { contains: q } }] : []),
    ...terms.flatMap((kw) => [
      { title: { contains: kw } },
      { summary: { contains: kw } },
      { body: { contains: kw } },
      {
        tags: {
          some: {
            tag: {
              OR: [{ name: { contains: kw } }, { slug: { contains: kw } }]
            }
          }
        }
      }
    ])
  ];

  const meId = req.user?.id;
  const isAdmin = String(req.user?.role ?? '') === 'admin';
  const statusFilter = isAdmin ? {} : { status: 'published' as const };

  const where = {
    ...statusFilter,
    ...(searchOr.length ? { OR: searchOr } : {}),
    ...(type ? { type: type as 'video' | 'image' | 'article' } : {}),
    ...(category ? { category: { slug: category } } : {})
  };
  const orderBy =
    sort === 'hot'
      ? [{ likes: { _count: 'desc' as const } }, { created_at: 'desc' as const }]
      : [{ created_at: 'desc' as const }];
  const [items, total] = await Promise.all([
    prisma.content.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, username: true, avatar: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { likes: true, favoriteItems: true, comments: true } }
      }
    }),
    prisma.content.count({ where })
  ]);
  let likedSet = new Set<number>();
  let favoredSet = new Set<number>();
  if (meId && items.length) {
    const ids = items.map((i) => i.id);
    const [likes, favs] = await Promise.all([
      prisma.contentLike.findMany({ where: { user_id: meId, content_id: { in: ids } }, select: { content_id: true } }),
      prisma.favoriteItem.findMany({
        where: { content_id: { in: ids }, folder: { user_id: meId } },
        select: { content_id: true }
      })
    ]);
    likedSet = new Set(likes.map((i) => i.content_id));
    favoredSet = new Set(favs.map((i) => i.content_id));
  }
  res.json({
    items: items.map((i) => ({
      ...i,
      liked: likedSet.has(i.id),
      favored: favoredSet.has(i.id)
    })),
    total,
    page,
    pageSize
  });
};

export const listMyContents = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  if (!me) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const status = String(req.query.status ?? '').trim();
  const where = {
    author_id: me,
    ...(status && ['pending', 'published', 'rejected'].includes(status) ? { status: status as 'pending' | 'published' | 'rejected' } : {})
  };
  const [items, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy: [{ updated_at: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { likes: true, favoriteItems: true, comments: true } }
      }
    }),
    prisma.content.count({ where })
  ]);
  res.json({ items, total, page, pageSize });
};

export const getContentById = async (req: AuthRequest, res: Response): Promise<void> => {
  await ensureLegacyVideosSynced();
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ message: 'Invalid id' });
    return;
  }
  const item = await prisma.content.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      author: { select: { id: true, username: true, avatar: true } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      _count: { select: { likes: true, favoriteItems: true, comments: true } }
    }
  });
  if (!item) {
    res.status(404).json({ message: 'Content not found' });
    return;
  }
  const meId = req.user?.id;
  const isAdmin = String(req.user?.role ?? '') === 'admin';
  if (item.status !== 'published' && !isAdmin && Number(item.author_id) !== Number(meId ?? 0)) {
    res.status(403).json({ message: 'Content not available' });
    return;
  }
  if (item.status === 'published' && !isAdmin) {
    await prisma.content.update({ where: { id }, data: { views: { increment: 1 } } });
  }
  const [liked, favored] = meId
    ? await Promise.all([
        prisma.contentLike.findFirst({ where: { user_id: meId, content_id: id }, select: { id: true } }),
        prisma.favoriteItem.findFirst({ where: { content_id: id, folder: { user_id: meId } }, select: { id: true } })
      ])
    : [null, null];
  res.json({ item: { ...item, liked: Boolean(liked), favored: Boolean(favored) } });
};

export const createContent = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  const type = String(req.body?.type ?? '').trim() as 'video' | 'image' | 'article';
  const title = String(req.body?.title ?? '').trim();
  const summary = String(req.body?.summary ?? '').trim();
  const body = String(req.body?.body ?? '').trim();
  const coverUrl = String(req.body?.cover_url ?? '').trim();
  const mediaUrl = String(req.body?.media_url ?? '').trim();
  const categorySlug = String(req.body?.category_slug ?? '').trim();
  const tagNames = normalizeTagsInput(req.body?.tags);
  if (!['video', 'image', 'article'].includes(type) || !title) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  const categoryId = await resolveCategoryId(categorySlug);
  const item = await prisma.content.create({
    data: {
      type,
      status: 'pending',
      title,
      summary: summary || undefined,
      body: body || undefined,
      cover_url: coverUrl || undefined,
      media_url: mediaUrl || undefined,
      category_id: categoryId,
      author_id: userId
    }
  });
  await connectTags(item.id, tagNames);
  await prisma.category.update({
    where: { id: categoryId },
    data: { request_count: { increment: 1 }, last_used_at: new Date() }
  });
  const withTags = await prisma.content.findUnique({
    where: { id: item.id },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      author: { select: { id: true, username: true, avatar: true } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      _count: { select: { likes: true, favoriteItems: true, comments: true } }
    }
  });
  res.status(201).json({ item: withTags ?? item, categoryPending: false });
};

export const updateContent = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  const isAdmin = String(req.user?.role ?? '') === 'admin';
  const id = Number(req.params.id);
  if (!me || !Number.isFinite(id)) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }

  const current = await prisma.content.findUnique({ where: { id }, select: { id: true, author_id: true, type: true } });
  if (!current) {
    res.status(404).json({ message: 'Content not found' });
    return;
  }
  if (!isAdmin && current.author_id !== me) {
    res.status(403).json({ message: 'No permission' });
    return;
  }

  const title = String(req.body?.title ?? '').trim();
  const summary = String(req.body?.summary ?? '').trim();
  const body = String(req.body?.body ?? '').trim();
  const coverUrl = String(req.body?.cover_url ?? '').trim();
  const mediaUrl = String(req.body?.media_url ?? '').trim();
  const categorySlug = String(req.body?.category_slug ?? '').trim();
  const tagNames = normalizeTagsInput(req.body?.tags);
  if (!title) {
    res.status(400).json({ message: '标题不能为空' });
    return;
  }

  const categoryId = await resolveCategoryId(categorySlug);

  const shouldPending = true;
  const item = await prisma.content.update({
    where: { id },
    data: {
      title,
      summary: summary || undefined,
      body: current.type === 'article' ? body || undefined : body || undefined,
      cover_url: coverUrl || undefined,
      media_url: mediaUrl || undefined,
      category_id: categoryId,
      ...(shouldPending ? { status: 'pending', reviewed_by: null, reviewed_at: null, reject_reason: null } : {})
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      author: { select: { id: true, username: true, avatar: true } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      _count: { select: { likes: true, favoriteItems: true, comments: true } }
    }
  });
  await prisma.contentTag.deleteMany({ where: { content_id: id } });
  await connectTags(id, tagNames);
  const withTags = await prisma.content.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      author: { select: { id: true, username: true, avatar: true } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      _count: { select: { likes: true, favoriteItems: true, comments: true } }
    }
  });
  res.json({ item: withTags ?? item, categoryPending: false, repending: shouldPending });
};

export const resubmitContent = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  const isAdmin = String(req.user?.role ?? '') === 'admin';
  const id = Number(req.params.id);
  if (!me || !Number.isFinite(id)) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  const current = await prisma.content.findUnique({ where: { id }, select: { id: true, author_id: true } });
  if (!current) {
    res.status(404).json({ message: 'Content not found' });
    return;
  }
  if (!isAdmin && current.author_id !== me) {
    res.status(403).json({ message: 'No permission' });
    return;
  }
  const item = await prisma.content.update({
    where: { id },
    data: { status: 'pending', reviewed_by: null, reviewed_at: null, reject_reason: null },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      author: { select: { id: true, username: true, avatar: true } },
      _count: { select: { likes: true, favoriteItems: true, comments: true } }
    }
  });
  res.json({ item, repending: true });
};

export const deleteContent = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  const isAdmin = String(req.user?.role ?? '') === 'admin';
  const id = Number(req.params.id);
  if (!me || !Number.isFinite(id)) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  const current = await prisma.content.findUnique({ where: { id }, select: { id: true, author_id: true } });
  if (!current) {
    res.status(404).json({ message: 'Content not found' });
    return;
  }
  if (!isAdmin && current.author_id !== me) {
    res.status(403).json({ message: 'No permission' });
    return;
  }

  await prisma.$transaction([
    prisma.contentTag.deleteMany({ where: { content_id: id } }),
    prisma.contentLike.deleteMany({ where: { content_id: id } }),
    prisma.favoriteItem.deleteMany({ where: { content_id: id } }),
    prisma.contentComment.deleteMany({ where: { content_id: id } }),
    prisma.notification.deleteMany({ where: { related_type: 'content', related_id: id } }),
    prisma.content.delete({ where: { id } })
  ]);
  res.json({ success: true });
};

export const likeContent = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const contentId = Number(req.params.id);
  if (!userId || !Number.isFinite(contentId)) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { id: true, status: true, author_id: true, title: true }
  });
  if (!content) {
    res.status(404).json({ message: 'Content not found' });
    return;
  }
  if (content.status !== 'published') {
    res.status(403).json({ message: '未审核通过的内容不支持点赞' });
    return;
  }

  const likedBefore = await prisma.contentLike.findFirst({
    where: { user_id: userId, content_id: contentId },
    select: { id: true }
  });
  await prisma.contentLike.upsert({
    where: { user_id_content_id: { user_id: userId, content_id: contentId } },
    update: {},
    create: { user_id: userId, content_id: contentId }
  });
  if (!likedBefore) {
    if (content.author_id === userId) {
      await prisma.contentLike.deleteMany({ where: { user_id: userId, content_id: contentId } });
      res.status(400).json({ message: '禁止给自己点赞' });
      return;
    }
    if (content.author_id !== userId) {
      const actor = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true }
      });
      await prisma.notification.create({
        data: {
          user_id: content.author_id,
          type: 'favorite',
          title: '你的内容被点赞了',
          body: `${actor?.username || '有用户'} 点赞了《${content.title}》`,
          related_type: 'content',
          related_id: contentId
        }
      });
    }
  }
  const count = await prisma.contentLike.count({ where: { content_id: contentId } });
  res.json({ liked: true, likeCount: count });
};

export const unlikeContent = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const contentId = Number(req.params.id);
  if (!userId || !Number.isFinite(contentId)) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  await prisma.contentLike.deleteMany({ where: { user_id: userId, content_id: contentId } });
  const count = await prisma.contentLike.count({ where: { content_id: contentId } });
  res.json({ liked: false, likeCount: count });
};

export const addFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const contentId = Number(req.params.id);
  if (!userId || !Number.isFinite(contentId)) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { id: true, status: true, author_id: true, title: true }
  });
  if (!content) {
    res.status(404).json({ message: 'Content not found' });
    return;
  }
  if (content.status !== 'published') {
    res.status(403).json({ message: '未审核通过的内容不支持收藏' });
    return;
  }

  const folderIdRaw = Number(req.body?.folder_id ?? 0);
  const folderId = Number.isFinite(folderIdRaw) && folderIdRaw > 0 ? folderIdRaw : undefined;
  const folder = folderId
    ? await prisma.favoriteFolder.findFirst({ where: { id: folderId, user_id: userId }, select: { id: true } })
    : await ensureDefaultFolder(userId);
  if (!folder) {
    res.status(404).json({ message: 'Folder not found' });
    return;
  }
  await prisma.favoriteItem.upsert({
    where: { folder_id_content_id: { folder_id: folder.id, content_id: contentId } },
    update: {},
    create: { folder_id: folder.id, content_id: contentId }
  });
  const count = await prisma.favoriteItem.count({ where: { content_id: contentId } });
  if (content.author_id !== userId) {
    await prisma.notification.create({
      data: {
        user_id: content.author_id,
        type: 'favorite',
        title: '你的内容被收藏了',
        body: `《${content.title}》收到新的收藏`,
        related_type: 'content',
        related_id: contentId
      }
    });
  }
  res.json({ favored: true, favoriteCount: count });
};

export const removeFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const contentId = Number(req.params.id);
  if (!userId || !Number.isFinite(contentId)) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  await prisma.favoriteItem.deleteMany({ where: { content_id: contentId, folder: { user_id: userId } } });
  const count = await prisma.favoriteItem.count({ where: { content_id: contentId } });
  res.json({ favored: false, favoriteCount: count });
};

export const listFavoriteFolders = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  await ensureDefaultFolder(userId);
  const items = await prisma.favoriteFolder.findMany({
    where: { user_id: userId },
    orderBy: [{ is_default: 'desc' }, { created_at: 'asc' }],
    include: { _count: { select: { items: true } } }
  });
  res.json({ items });
};

export const createFavoriteFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  const name = String(req.body?.name ?? '').trim();
  if (!name || name.length > 30) {
    res.status(400).json({ message: '收藏夹名称长度需在 1-30 之间' });
    return;
  }
  const item = await prisma.favoriteFolder.create({
    data: { user_id: userId, name }
  });
  res.status(201).json({ item });
};

export const listFavoriteItems = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  const folderId = Number(req.query.folderId ?? 0);
  const folder = Number.isFinite(folderId) && folderId > 0 ? folderId : undefined;
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));

  const where = {
    folder: { user_id: userId },
    ...(folder ? { folder_id: folder } : {})
  };

  const [items, total] = await Promise.all([
    prisma.favoriteItem.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        folder: { select: { id: true, name: true } },
        content: { include: { category: { select: { id: true, name: true, slug: true } } } }
      }
    }),
    prisma.favoriteItem.count({ where })
  ]);

  res.json({ items, total, page, pageSize });
};

export const removeFavoriteItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const id = Number(req.params.id);
  if (!userId || !Number.isFinite(id)) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  await prisma.favoriteItem.deleteMany({ where: { id, folder: { user_id: userId } } });
  res.json({ success: true });
};

export const moveFavoriteItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const id = Number(req.params.id);
  const targetFolderId = Number(req.body?.targetFolderId);
  if (!userId || !Number.isFinite(id) || !Number.isFinite(targetFolderId) || targetFolderId <= 0) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  const item = await prisma.favoriteItem.findFirst({
    where: { id, folder: { user_id: userId } },
    select: { id: true, content_id: true, folder_id: true }
  });
  if (!item) {
    res.status(404).json({ message: 'Favorite item not found' });
    return;
  }
  const targetFolder = await prisma.favoriteFolder.findFirst({
    where: { id: targetFolderId, user_id: userId },
    select: { id: true }
  });
  if (!targetFolder) {
    res.status(404).json({ message: 'Target folder not found' });
    return;
  }
  if (item.folder_id === targetFolder.id) {
    res.json({ success: true, unchanged: true });
    return;
  }
  await prisma.favoriteItem.upsert({
    where: { folder_id_content_id: { folder_id: targetFolder.id, content_id: item.content_id } },
    update: {},
    create: { folder_id: targetFolder.id, content_id: item.content_id }
  });
  await prisma.favoriteItem.delete({ where: { id: item.id } });
  res.json({ success: true });
};

export const listContentComments = async (req: Request, res: Response): Promise<void> => {
  const contentId = Number(req.params.id);
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  if (!Number.isFinite(contentId)) {
    res.status(400).json({ message: 'Invalid content id' });
    return;
  }
  const where = { content_id: contentId, parent_id: null as number | null };
  const [roots, totalRoot, totalAll] = await Promise.all([
    prisma.contentComment.findMany({
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
            replyToUser: { select: { id: true, username: true, status: true } }
          }
        }
      }
    }),
    prisma.contentComment.count({ where }),
    prisma.contentComment.count({ where: { content_id: contentId } })
  ]);
  res.json({ items: roots, total: totalAll, totalRoot, page, pageSize });
};

export const postContentComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const contentId = Number(req.params.id);
  if (!userId || !Number.isFinite(contentId)) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  const text = String(req.body?.content ?? '').trim();
  const parentIdRaw = req.body?.parent_id;
  const parentId = Number.isFinite(Number(parentIdRaw)) ? Number(parentIdRaw) : undefined;
  const replyToUserIdRaw = req.body?.reply_to_user_id;
  const replyToUserId = Number.isFinite(Number(replyToUserIdRaw)) ? Number(replyToUserIdRaw) : undefined;
  if (!text || text.length > 1000) {
    res.status(400).json({ message: '评论内容长度需在 1-1000 之间' });
    return;
  }
  if (parentId) {
    const parent = await prisma.contentComment.findUnique({ where: { id: parentId }, select: { parent_id: true, content_id: true } });
    if (!parent || parent.content_id !== contentId || parent.parent_id) {
      res.status(400).json({ message: '只支持一级评论下回复' });
      return;
    }
  }
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { status: true, username: true } });
  if (!me || me.status !== 'active') {
    res.status(403).json({ message: 'Account suspended' });
    return;
  }
  const created = await prisma.contentComment.create({
    data: {
      content_id: contentId,
      user_id: userId,
      comment_text: text,
      parent_id: parentId,
      reply_to_user_id: replyToUserId
    }
  });
  if (replyToUserId && replyToUserId !== userId) {
    await prisma.notification.create({
      data: {
        user_id: replyToUserId,
        type: 'reply',
        title: '你收到一条回复',
        body: `${me.username} 回复了你`,
        related_type: 'content_comment',
        related_id: created.id
      }
    });
  }
  const mentions = extractMentions(text);
  if (mentions.length) {
    const users = await prisma.user.findMany({
      where: { username: { in: mentions }, id: { not: userId } },
      select: { id: true, username: true }
    });
    if (users.length) {
      await prisma.notification.createMany({
        data: users.map((u) => ({
          user_id: u.id,
          type: 'mention',
          title: '你被提及了',
          body: `${me.username} 在评论中提到了你`,
          related_type: 'content_comment',
          related_id: created.id
        })),
        skipDuplicates: true
      });
    }
  }
  res.status(201).json({ comment: created });
};
