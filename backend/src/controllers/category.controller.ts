import { Response } from 'express';
import { prisma } from '../config/prisma';
import type { AuthRequest } from '../middlewares/auth.middleware';

const FIXED_CATEGORIES = [
  { name: '默认', slug: 'default', description: '系统默认分区' },
  { name: '科技', slug: 'tech', description: '科技数码、编程、前沿技术' },
  { name: '游戏', slug: 'game', description: '主机、端游、手游、电竞' },
  { name: '娱乐', slug: 'ent', description: '综艺、搞笑、明星、八卦' },
  { name: '知识', slug: 'knowledge', description: '科普、学习、教程、职场' },
  { name: '生活', slug: 'life', description: '日常、Vlog、美食、出行' },
  { name: '影视', slug: 'movie', description: '电影、剧集、影评、剪辑' },
  { name: '音乐', slug: 'music', description: '翻唱、演奏、MV、乐评' },
  { name: '动画', slug: 'anime', description: '二次元、番剧、MAD、AMV' },
  { name: '运动', slug: 'sport', description: '体育、健身、赛事、户外' },
  { name: '时尚', slug: 'fashion', description: '穿搭、美妆、潮流、审美' }
] as const;

const FIXED_SLUG_SET: Set<string> = new Set(FIXED_CATEGORIES.map((x) => x.slug));
const FIXED_ORDER: Map<string, number> = new Map(FIXED_CATEGORIES.map((x, i) => [x.slug, i]));

const ensureFixedCategories = async (): Promise<void> => {
  const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } });
  const ownerId = admin?.id ?? 1;
  for (const cat of FIXED_CATEGORIES) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        status: 'approved'
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        status: 'approved',
        creator_id: ownerId,
        reviewed_by: admin?.id ?? null,
        reviewed_at: new Date(),
        request_count: 0
      }
    });
  }
};

export const listCategories = async (_req: AuthRequest, res: Response): Promise<void> => {
  await ensureFixedCategories();
  const q = String(_req.query.q ?? '').trim();
  const raw = await prisma.category.findMany({
    where: {
      status: 'approved',
      slug: { in: Array.from(FIXED_SLUG_SET) },
      ...(q ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] } : {})
    },
    select: { id: true, name: true, slug: true, description: true, status: true, creator_id: true, created_at: true }
  });
  const items = raw.sort((a, b) => (FIXED_ORDER.get(a.slug) ?? 999) - (FIXED_ORDER.get(b.slug) ?? 999));
  res.json({ items });
};

export const listMyCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  await ensureFixedCategories();
  const me = req.user?.id;
  if (!me) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  const q = String(req.query.q ?? '').trim();
  const raw = await prisma.category.findMany({
    where: {
      status: 'approved',
      slug: { in: Array.from(FIXED_SLUG_SET) },
      ...(q ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] } : {})
    },
    select: { id: true, name: true, slug: true, description: true, status: true, creator_id: true, created_at: true }
  });
  const items = raw.sort((a, b) => (FIXED_ORDER.get(a.slug) ?? 999) - (FIXED_ORDER.get(b.slug) ?? 999));
  res.json({ items });
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  await ensureFixedCategories();
  res.status(403).json({ message: '分区为固定大类，暂不支持新增' });
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  await ensureFixedCategories();
  res.status(403).json({ message: '分区为固定大类，暂不支持删除' });
};
