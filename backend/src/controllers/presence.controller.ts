import { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { getOnlineMap, getTypingMapForReceiver, heartbeat, setTyping } from '../services/presence.service';

export const postHeartbeat = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  if (!me) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  heartbeat(me);
  res.json({ ok: true, ts: Date.now() });
};

export const getOnlineUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  if (!me) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  const raw = String(req.query.ids ?? '').trim();
  const ttlMs = Math.min(5 * 60_000, Math.max(10_000, Number(req.query.ttlMs ?? 60_000)));
  const ids = raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 200);
  const online = getOnlineMap(ids, ttlMs);
  res.json({ online, ttlMs });
};

export const postTyping = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  const toUserId = Number(req.body?.toUserId ?? 0);
  const typing = Boolean(req.body?.typing ?? false);
  if (!me || !Number.isFinite(toUserId) || toUserId <= 0 || toUserId === me) {
    res.status(400).json({ message: 'Invalid params' });
    return;
  }
  setTyping(me, toUserId, typing);
  res.json({ ok: true });
};

export const getTyping = async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.user?.id;
  if (!me) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  const raw = String(req.query.ids ?? '').trim();
  const ttlMs = Math.min(15_000, Math.max(2_000, Number(req.query.ttlMs ?? 6_000)));
  const ids = raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 200);
  const typing = getTypingMapForReceiver(me, ids, ttlMs);
  res.json({ typing, ttlMs });
};

