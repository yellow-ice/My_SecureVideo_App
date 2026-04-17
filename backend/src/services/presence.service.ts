const onlineMap = new Map<number, number>();
const typingMap = new Map<string, number>();

const now = () => Date.now();

export const heartbeat = (userId: number) => {
  if (!Number.isFinite(userId) || userId <= 0) return;
  onlineMap.set(userId, now());
};

export const isOnline = (userId: number, ttlMs = 60_000) => {
  const t = onlineMap.get(userId);
  if (!t) return false;
  return now() - t <= ttlMs;
};

export const getOnlineMap = (userIds: number[], ttlMs = 60_000): Record<number, boolean> => {
  const out: Record<number, boolean> = {};
  for (const id of userIds) {
    if (!Number.isFinite(id) || id <= 0) continue;
    out[id] = isOnline(id, ttlMs);
  }
  return out;
};

const typingKey = (fromUserId: number, toUserId: number) => `${fromUserId}->${toUserId}`;

export const setTyping = (fromUserId: number, toUserId: number, typing: boolean) => {
  if (!Number.isFinite(fromUserId) || fromUserId <= 0) return;
  if (!Number.isFinite(toUserId) || toUserId <= 0) return;
  const k = typingKey(fromUserId, toUserId);
  if (!typing) {
    typingMap.delete(k);
    return;
  }
  typingMap.set(k, now());
};

export const getTypingMapForReceiver = (receiverId: number, senderIds: number[], ttlMs = 6_000): Record<number, boolean> => {
  const out: Record<number, boolean> = {};
  for (const sid of senderIds) {
    if (!Number.isFinite(sid) || sid <= 0) continue;
    const t = typingMap.get(typingKey(sid, receiverId));
    out[sid] = !!t && now() - t <= ttlMs;
  }
  return out;
};

