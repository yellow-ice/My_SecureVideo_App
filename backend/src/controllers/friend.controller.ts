import { Response } from 'express';
import { prisma } from '../config/prisma';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { getSecurityState } from '../services/security-state.service';
import crypto from 'crypto';
import { env } from '../config/env';

const pair = (a: number, b: number) => (a < b ? { low: a, high: b } : { low: b, high: a });
const ENC_PREFIX = 'ENC::v1::';
const b64 = (buf: Buffer): string => buf.toString('base64');
const fromB64 = (s: string): Buffer => Buffer.from(s, 'base64');
const deriveKey = (): Buffer => crypto.createHash('sha256').update(String(env.jwtSecret)).digest(); // 32 bytes

const encryptChatContent = (content: string): string => {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${b64(iv)}:${b64(tag)}:${b64(ct)}`;
};

const decryptChatContent = (raw: string): string => {
  if (!raw.startsWith(ENC_PREFIX)) return raw;
  const payload = raw.slice(ENC_PREFIX.length);
  const [ivB64, tagB64, ctB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !ctB64) return raw;
  try {
    const key = deriveKey();
    const iv = fromB64(ivB64);
    const tag = fromB64(tagB64);
    const ct = fromB64(ctB64);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString('utf8');
  } catch {
    return '[解密失败]';
  }
};

const getFriendship = async (a: number, b: number) => {
  const p = pair(a, b);
  return prisma.friendship.findUnique({
    where: { user_low_id_user_high_id: { user_low_id: p.low, user_high_id: p.high } }
  });
};

export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  const q = String(req.query.q ?? '').trim();
  if (!me) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  if (!q) {
    res.json({ items: [] });
    return;
  }
  const items = await prisma.user.findMany({
    where: {
      id: { not: me },
      OR: [{ username: { contains: q } }, { email: { contains: q } }]
    },
    take: 20,
    select: { id: true, username: true, email: true, avatar: true, status: true }
  });
  res.json({ items });
};

export const listFriendRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  if (!me) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  const [incoming, outgoing, handledIncoming] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { receiver_id: me, status: 'pending' },
      orderBy: { created_at: 'desc' },
      include: { sender: { select: { id: true, username: true, avatar: true, status: true } } }
    }),
    prisma.friendRequest.findMany({
      where: { sender_id: me, status: 'pending' },
      orderBy: { created_at: 'desc' },
      include: { receiver: { select: { id: true, username: true, avatar: true, status: true } } }
    }),
    prisma.friendRequest.findMany({
      where: { receiver_id: me, status: { in: ['accepted', 'rejected'] } },
      orderBy: [{ handled_at: 'desc' }, { created_at: 'desc' }],
      take: 30,
      include: { sender: { select: { id: true, username: true, avatar: true, status: true } } }
    })
  ]);
  res.json({ incoming, outgoing, handledIncoming });
};

export const sendFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const senderId = req.user?.id;
  const receiverId = Number(req.body?.receiverId);
  const message = String(req.body?.message ?? '').trim();
  if (!senderId || !Number.isFinite(receiverId) || receiverId <= 0 || receiverId === senderId) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true, status: true } });
  if (!receiver || receiver.status !== 'active') {
    res.status(404).json({ message: 'User not available' });
    return;
  }
  const fs = await getFriendship(senderId, receiverId);
  if (fs) {
    res.status(409).json({ message: 'Already friends' });
    return;
  }
  const pending = await prisma.friendRequest.findFirst({
    where: {
      status: 'pending',
      OR: [
        { sender_id: senderId, receiver_id: receiverId },
        { sender_id: receiverId, receiver_id: senderId }
      ]
    },
    select: { id: true }
  });
  if (pending) {
    res.status(409).json({ message: 'Request already pending' });
    return;
  }
  const reqItem = await prisma.friendRequest.create({
    data: { sender_id: senderId, receiver_id: receiverId, message: message || undefined }
  });
  const me = await prisma.user.findUnique({ where: { id: senderId }, select: { username: true } });
  await prisma.notification.create({
    data: {
      user_id: receiverId,
      type: 'system',
      title: '你收到一个好友申请',
      body: `${me?.username ?? '有人'} 请求添加你为好友`,
      related_type: 'friend_request',
      related_id: reqItem.id
    }
  });
  res.status(201).json({ request: reqItem });
};

export const respondFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  const id = Number(req.params.id);
  const action = String(req.body?.action ?? '').toLowerCase();
  if (!me || !Number.isFinite(id) || !['accept', 'reject'].includes(action)) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  const request = await prisma.friendRequest.findUnique({ where: { id } });
  if (!request || request.receiver_id !== me || request.status !== 'pending') {
    res.status(404).json({ message: 'Request not found' });
    return;
  }
  if (action === 'accept') {
    const p = pair(request.sender_id, request.receiver_id);
    await prisma.friendship.upsert({
      where: { user_low_id_user_high_id: { user_low_id: p.low, user_high_id: p.high } },
      update: {},
      create: { user_low_id: p.low, user_high_id: p.high }
    });
  }
  const updated = await prisma.friendRequest.update({
    where: { id },
    data: { status: action === 'accept' ? 'accepted' : 'rejected', handled_at: new Date() }
  });
  const [meInfo, senderInfo] = await Promise.all([
    prisma.user.findUnique({ where: { id: me }, select: { username: true } }),
    prisma.user.findUnique({ where: { id: request.sender_id }, select: { username: true } })
  ]);
  if (action === 'accept') {
    await prisma.notification.createMany({
      data: [
        {
          user_id: request.sender_id,
          type: 'system',
          title: '好友申请已通过',
          body: `${meInfo?.username ?? '对方'} 同意了你的好友申请`,
          related_type: 'friend_request',
          related_id: request.id
        },
        {
          user_id: me,
          type: 'system',
          title: '已同意好友申请',
          body: `你已同意 ${senderInfo?.username ?? '该用户'} 的好友申请，你们现在可以聊天了`,
          related_type: 'friend_request',
          related_id: request.id
        }
      ]
    });
  } else {
    await prisma.notification.create({
      data: {
        user_id: request.sender_id,
        type: 'system',
        title: '好友申请被拒绝',
        body: `${meInfo?.username ?? '对方'} 拒绝了你的好友申请`,
        related_type: 'friend_request',
        related_id: request.id
      }
    });
  }
  res.json({ request: updated });
};

export const listFriends = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  if (!me) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  const friendShips = await prisma.friendship.findMany({
    where: { OR: [{ user_low_id: me }, { user_high_id: me }] },
    orderBy: { created_at: 'desc' },
    include: {
      userLow: { select: { id: true, username: true, avatar: true, status: true } },
      userHigh: { select: { id: true, username: true, avatar: true, status: true } },
      messages: { orderBy: { created_at: 'desc' }, take: 1, select: { id: true, content: true, created_at: true, sender_id: true } }
    }
  });
  const items = friendShips.map((f) => {
    const friend = f.user_low_id === me ? f.userHigh : f.userLow;
    const lastMessage = f.messages[0] ? { ...f.messages[0], content: decryptChatContent(f.messages[0].content) } : null;
    return { id: f.id, friend, lastMessage, created_at: f.created_at };
  });
  res.json({ items });
};

export const listChatMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  const friendId = Number(req.params.friendId);
  if (!me || !Number.isFinite(friendId)) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  const friendship = await getFriendship(me, friendId);
  if (!friendship) {
    res.status(404).json({ message: 'Not friends' });
    return;
  }
  const take = Math.min(200, Math.max(1, Number(req.query.take ?? 80)));
  const beforeId = Number(req.query.beforeId ?? 0);
  const include = { sender: { select: { id: true, username: true, avatar: true } } } as const;
  const items =
    Number.isFinite(beforeId) && beforeId > 0
      ? (
          await prisma.chatMessage.findMany({
            where: { friendship_id: friendship.id, id: { lt: beforeId } },
            orderBy: { id: 'desc' },
            take,
            include
          })
        ).reverse()
      : await prisma.chatMessage.findMany({
          where: { friendship_id: friendship.id },
          orderBy: { created_at: 'asc' },
          take,
          include
        });
  await prisma.chatMessage.updateMany({
    where: { friendship_id: friendship.id, sender_id: { not: me }, is_read: false },
    data: { is_read: true }
  });
  const safeItems = items.map((item) => ({ ...item, content: decryptChatContent(item.content) }));
  res.json({ items: safeItems, friendshipId: friendship.id });
};

export const sendChatMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  const friendId = Number(req.params.friendId);
  const content = String(req.body?.content ?? '').trim();
  if (!me || !Number.isFinite(friendId) || !content || content.length > 2000) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  const friendship = await getFriendship(me, friendId);
  if (!friendship) {
    res.status(404).json({ message: 'Not friends' });
    return;
  }
  const msg = await prisma.chatMessage.create({
    data: {
      friendship_id: friendship.id,
      sender_id: me,
      content: getSecurityState().chatEncryptionEnabled ? encryptChatContent(content) : content
    }
  });
  const meInfo = await prisma.user.findUnique({ where: { id: me }, select: { username: true } });
  await prisma.notification.create({
    data: {
      user_id: friendId,
      type: 'system',
      title: '你收到新消息',
      body: `${meInfo?.username ?? '好友'}：${content.slice(0, 40)}`,
      related_type: 'friend_chat',
      related_id: msg.id
    }
  });
  res.status(201).json({ message: msg });
};

export const removeFriend = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  const friendId = Number(req.params.friendId);
  if (!me || !Number.isFinite(friendId) || friendId <= 0 || friendId === me) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  const p = pair(me, friendId);
  const friendship = await prisma.friendship.findUnique({
    where: { user_low_id_user_high_id: { user_low_id: p.low, user_high_id: p.high } },
    select: { id: true }
  });
  if (!friendship) {
    res.status(404).json({ message: 'Not friends' });
    return;
  }

  await prisma.$transaction([
    prisma.chatMessage.deleteMany({ where: { friendship_id: friendship.id } }),
    prisma.friendship.delete({ where: { user_low_id_user_high_id: { user_low_id: p.low, user_high_id: p.high } } }),
    prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { sender_id: me, receiver_id: friendId },
          { sender_id: friendId, receiver_id: me }
        ]
      }
    })
  ]);
  res.json({ ok: true });
};

export const clearChatMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  const friendId = Number(req.params.friendId);
  if (!me || !Number.isFinite(friendId) || friendId <= 0 || friendId === me) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  const friendship = await getFriendship(me, friendId);
  if (!friendship) {
    res.status(404).json({ message: 'Not friends' });
    return;
  }
  await prisma.chatMessage.deleteMany({ where: { friendship_id: friendship.id } });
  res.json({ ok: true });
};
