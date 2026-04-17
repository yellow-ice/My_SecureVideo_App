type Counter = { failCount: number; lockUntil?: number };

import { env } from '../config/env';

const counters = new Map<string, Counter>();
const LOCK_MS = 2 * 60 * 1000;
const MAX_FAIL = 10;

export const canAttemptLogin = (ip: string): { allowed: boolean; retryAfterSec?: number } => {
  // 本机/开发环境关闭锁定，避免本地测试被误伤
  if (env.disableBruteforce || env.nodeEnv === 'development') return { allowed: true };
  const c = counters.get(ip);
  if (!c?.lockUntil) return { allowed: true };
  if (Date.now() > c.lockUntil) {
    counters.set(ip, { failCount: 0 });
    return { allowed: true };
  }
  return { allowed: false, retryAfterSec: Math.ceil((c.lockUntil - Date.now()) / 1000) };
};

export const registerFailedLogin = (ip: string): { locked: boolean; failCount: number } => {
  const old = counters.get(ip) ?? { failCount: 0 };
  const failCount = old.failCount + 1;
  const locked = failCount >= MAX_FAIL;
  counters.set(ip, { failCount, lockUntil: locked ? Date.now() + LOCK_MS : undefined });
  return { locked, failCount };
};

export const resetLoginCounter = (ip: string): void => {
  counters.set(ip, { failCount: 0 });
};

export const resetLoginCounterByPrefix = (prefix: string): void => {
  if (!prefix) return;
  for (const key of counters.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`)) {
      counters.set(key, { failCount: 0 });
    }
  }
};
