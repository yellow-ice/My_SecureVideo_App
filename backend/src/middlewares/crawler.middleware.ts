import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { emitSecurityEvent } from '../services/realtime.service';
import { env } from '../config/env';
import { getSecurityState } from '../services/security-state.service';

const ipWindows = new Map<string, number[]>();
const banned = new Set<string>();
const WINDOW_MS = 60 * 1000;
const MAX_REQ = 40;
const badUA = [/python-requests/i, /scrapy/i, /curl\//i];

export const crawlerGuard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const securityState = getSecurityState();
  if (!securityState.antiCrawlerEnabled) {
    next();
    return;
  }
  // 本机/开发环境放行，避免本地频繁刷新/联调触发 429
  if (env.nodeEnv === 'development' || env.disableBruteforce) {
    next();
    return;
  }
  const ip = req.ip ?? 'unknown';
  if (banned.has(ip)) {
    res.status(403).json({ message: 'IP is banned', ip });
    return;
  }
  const ua = req.headers['user-agent'] ?? '';
  if (badUA.some((r) => r.test(ua))) {
    await prisma.systemLog.create({
      data: { level: 'warn', module: 'crawler', message: 'Blocked suspicious UA', ip_address: ip }
    });
    emitSecurityEvent({ type: 'crawler', ip, path: req.path, detail: '命中可疑UA并阻断', level: 'medium' });
    res.status(403).json({ message: '疑似爬虫UA，已阻断' });
    return;
  }
  const now = Date.now();
  const list = (ipWindows.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  ipWindows.set(ip, list);
  if (list.length > MAX_REQ) {
    await prisma.systemLog.create({
      data: { level: 'warn', module: 'crawler', message: `Captcha required count=${list.length}`, ip_address: ip }
    });
    emitSecurityEvent({ type: 'crawler', ip, path: req.path, detail: '频率异常，触发验证码', level: 'medium' });
    res.status(429).json({ message: '请求过于频繁，请完成验证码验证', captchaRequired: true });
    return;
  }
  next();
};

export const getBannedIps = (): string[] => Array.from(banned);

export const banIp = (ip: string): void => {
  banned.add(ip);
};
