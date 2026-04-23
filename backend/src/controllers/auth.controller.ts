import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { canAttemptLogin, registerFailedLogin, resetLoginCounter, resetLoginCounterByPrefix } from '../services/bruteforce.service';
import { emitSecurityEvent } from '../services/realtime.service';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, username, password } = req.body as { email: string; username: string; password: string };
  if (!email || !username || !password || password.length < 6) {
    res.status(400).json({ message: 'Invalid register params' });
    return;
  }
  const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (exists) {
    res.status(409).json({ message: 'Email or username already used' });
    return;
  }
  const password_hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, username, password_hash, role: 'user' } });
  res.status(201).json({ user: { id: user.id, email: user.email, username: user.username, role: user.role } });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  const ip = req.ip ?? 'unknown';
  const loginKey = `${ip}:${normalizedEmail || 'unknown'}`;
  // #region agent log
  fetch('http://127.0.0.1:7763/ingest/f7634983-5a77-4a9d-a744-81ae45180aea',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1a4728'},body:JSON.stringify({sessionId:'1a4728',runId:'pre-fix-login',hypothesisId:'H1-H4',location:'src/controllers/auth.controller.ts:31',message:'Login request received',data:{ip,hasEmail:Boolean(normalizedEmail),hasPassword:Boolean(password)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const policy = canAttemptLogin(loginKey);
  // #region agent log
  fetch('http://127.0.0.1:7763/ingest/f7634983-5a77-4a9d-a744-81ae45180aea',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1a4728'},body:JSON.stringify({sessionId:'1a4728',runId:'pre-fix-login',hypothesisId:'H2-H4',location:'src/controllers/auth.controller.ts:35',message:'Login policy evaluated',data:{allowed:policy.allowed,retryAfterSec:policy.retryAfterSec ?? 0},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (!policy.allowed) {
    emitSecurityEvent({
      type: 'bruteforce',
      ip,
      path: '/api/auth/login',
      detail: `登录已锁定，剩余${policy.retryAfterSec}s`,
      level: 'high'
    });
    res.status(429).json({ message: `登录已锁定，请${policy.retryAfterSec}s后再试` });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  // #region agent log
  fetch('http://127.0.0.1:7763/ingest/f7634983-5a77-4a9d-a744-81ae45180aea',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1a4728'},body:JSON.stringify({sessionId:'1a4728',runId:'pre-fix-login',hypothesisId:'H3-H4',location:'src/controllers/auth.controller.ts:49',message:'User lookup result',data:{userFound:Boolean(user)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const fail = registerFailedLogin(loginKey);
    if (fail.locked) {
      await prisma.systemLog.create({
        data: { level: 'warn', module: 'auth', message: `Bruteforce locked after ${fail.failCount} fails`, ip_address: ip }
      });
      emitSecurityEvent({
        type: 'bruteforce',
        ip,
        path: '/api/auth/login',
        detail: '触发暴力破解锁定15分钟（模拟邮件已发送）',
        level: 'high'
      });
    }
    res.status(401).json({ message: 'Invalid credentials' });
    // #region agent log
    fetch('http://127.0.0.1:7763/ingest/f7634983-5a77-4a9d-a744-81ae45180aea',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1a4728'},body:JSON.stringify({sessionId:'1a4728',runId:'pre-fix-login',hypothesisId:'H3',location:'src/controllers/auth.controller.ts:67',message:'Login rejected',data:{reason:'invalid_credentials_or_password_mismatch'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return;
  }
  if (user.status !== 'active') {
    res.status(403).json({ message: 'Account suspended' });
    return;
  }
  resetLoginCounter(loginKey);
  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, env.jwtSecret, { expiresIn: '7d' });
  await prisma.user.update({ where: { id: user.id }, data: { last_login: new Date() } });
  res.json({ token, user: { id: user.id, email: user.email, username: user.username, role: user.role, avatar: user.avatar } });
  // #region agent log
  fetch('http://127.0.0.1:7763/ingest/f7634983-5a77-4a9d-a744-81ae45180aea',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1a4728'},body:JSON.stringify({sessionId:'1a4728',runId:'pre-fix-login',hypothesisId:'H5',location:'src/controllers/auth.controller.ts:80',message:'Login success',data:{userId:user.id,role:user.role},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
};

export const demoAccounts = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    accounts: [
      { role: 'admin', email: 'admin@securevideo.com', password: 'Admin@123456', username: 'platform_admin' },
      { role: 'user', email: 'user@securevideo.com', password: 'User@123456', username: 'demo_user' }
    ]
  });
};

export const adminUnlockLogin = async (req: AuthRequest, res: Response): Promise<void> => {
  // 管理员一键解锁当前 IP 的登录计数（用于演练后恢复）
  const ip = req.ip ?? 'unknown';
  resetLoginCounterByPrefix(ip);
  emitSecurityEvent({
    type: 'admin_action',
    ip,
    path: '/api/auth/admin/unlock-login',
    detail: '管理员已重置当前 IP 的登录锁定/失败计数',
    level: 'low'
  });
  res.json({ ok: true, ip });
};

export const profile = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  res.json({ user });
};

export const profileById = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ message: 'Invalid user id' });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, avatar: true, bio: true, role: true, status: true, created_at: true, last_login: true }
  });
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  const followerCount = await prisma.friendship.count({
    where: {
      OR: [{ user_low_id: id }, { user_high_id: id }]
    }
  });
  res.json({ user: { ...user, follower_count: followerCount } });
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { username, avatar, bio } = req.body as { username?: string; avatar?: string; bio?: string };
  const nextName = username?.trim();
  const nextBio = typeof bio === 'string' ? bio.trim() : undefined;
  const file = (req as any).file as Express.Multer.File | undefined;
  if (nextName && nextName.length > 40) {
    res.status(400).json({ message: 'Username too long' });
    return;
  }
  if (typeof nextBio === 'string' && nextBio.length > 300) {
    res.status(400).json({ message: 'Bio too long' });
    return;
  }
  const nextAvatarFromFile =
    file && file.mimetype?.startsWith('image/')
      ? `/uploads/covers/${file.filename}`
      : undefined;
  const nextAvatarFromBody =
    typeof avatar === 'string' && avatar.length <= 180
      ? avatar.trim()
      : undefined;
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(nextName ? { username: nextName } : {}),
      ...(typeof nextBio === 'string' ? { bio: nextBio } : {}),
      ...(nextAvatarFromFile ? { avatar: nextAvatarFromFile } : {}),
      ...(nextAvatarFromBody && !nextAvatarFromFile ? { avatar: nextAvatarFromBody } : {})
    }
  });
  res.json({ user });
};

export const deactivateSelf = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'suspended',
      avatar: null
    }
  });
  await prisma.systemLog.create({
    data: {
      level: 'warn',
      module: 'auth',
      message: `user_deactivate ${userId}`,
      user_id: userId,
      ip_address: req.ip
    }
  });
  res.json({ success: true, user: { id: user.id, status: user.status } });
};

export const uploadAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) {
    res.status(400).json({ message: 'Missing file' });
    return;
  }
  if (!file.mimetype?.startsWith('image/')) {
    res.status(400).json({ message: 'Avatar must be an image' });
    return;
  }
  res.json({ url: `/uploads/covers/${file.filename}` });
};
