import { Response } from 'express';
import { prisma } from '../config/prisma';
import type { AuthRequest } from '../middlewares/auth.middleware';

export const listNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  const items = await prisma.notification.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: 100
  });
  const unread = items.filter((i) => !i.is_read).length;
  res.json({ items, unread });
};

export const markNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const id = Number(req.params.id);
  if (!userId || !Number.isFinite(id)) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  await prisma.notification.updateMany({
    where: { id, user_id: userId },
    data: { is_read: true }
  });
  res.json({ success: true });
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  await prisma.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true }
  });
  res.json({ success: true });
};

export const resolveNotificationTarget = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const id = Number(req.params.id);
  if (!userId || !Number.isFinite(id)) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  const notification = await prisma.notification.findFirst({
    where: { id, user_id: userId },
    select: { id: true, related_type: true, related_id: true }
  });
  if (!notification) {
    res.status(404).json({ message: 'Notification not found' });
    return;
  }
  const relatedType = String(notification.related_type ?? '');
  const relatedId = Number(notification.related_id ?? 0);
  if (!Number.isFinite(relatedId) || relatedId <= 0) {
    res.json({ path: '/notifications' });
    return;
  }

  if (relatedType === 'content_comment') {
    const comment = await prisma.contentComment.findUnique({
      where: { id: relatedId },
      select: { id: true, parent_id: true, content_id: true }
    });
    if (!comment) {
      res.json({ path: '/notifications' });
      return;
    }
    const commentId = comment.parent_id ?? comment.id;
    const replyQuery = comment.parent_id ? `&replyId=${comment.id}` : '';
    res.json({ path: `/contents/${comment.content_id}?commentId=${commentId}${replyQuery}` });
    return;
  }

  if (relatedType === 'video_comment') {
    const comment = await prisma.comment.findUnique({
      where: { id: relatedId },
      select: { id: true, parent_id: true, video_id: true }
    });
    if (!comment) {
      res.json({ path: '/notifications' });
      return;
    }
    const commentId = comment.parent_id ?? comment.id;
    const replyQuery = comment.parent_id ? `&replyId=${comment.id}` : '';
    res.json({ path: `/videos/${comment.video_id}?commentId=${commentId}${replyQuery}` });
    return;
  }

  if (relatedType === 'content') {
    res.json({ path: `/contents/${relatedId}` });
    return;
  }

  if (relatedType === 'friend_request') {
    res.json({ path: '/notifications?view=requests' });
    return;
  }

  if (relatedType === 'friend_chat') {
    const msg = await prisma.chatMessage.findUnique({
      where: { id: relatedId },
      include: { friendship: { select: { user_low_id: true, user_high_id: true } } }
    });
    if (!msg) {
      res.json({ path: '/notifications?view=chat' });
      return;
    }
    const friendId = msg.friendship.user_low_id === userId ? msg.friendship.user_high_id : msg.friendship.user_low_id;
    res.json({ path: `/notifications?view=chat&friendId=${friendId}&messageId=${msg.id}` });
    return;
  }

  res.json({ path: '/notifications' });
};
