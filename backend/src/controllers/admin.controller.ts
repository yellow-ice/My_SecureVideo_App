import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';
import { calculateRiskScore } from '../services/security.service';
import { getSecurityState, setDefenseEnabled, setSecuritySwitches } from '../services/security-state.service';
import { banIp as banCrawlerIp, getBannedIps } from '../middlewares/crawler.middleware';
import { emitSecurityEvent } from '../services/realtime.service';
import geoip from 'geoip-lite';
import type { AuthRequest } from '../middlewares/auth.middleware';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

type RevealTokenInfo = { token: string; expiresAt: number };
const revealTokens = new Map<number, RevealTokenInfo>();

const issueRevealToken = (userId: number): string => {
  const token = crypto.randomBytes(18).toString('base64url');
  revealTokens.set(userId, { token, expiresAt: Date.now() + 60_000 });
  return token;
};

const canReveal = (userId: number, token?: string): boolean => {
  if (!token) return false;
  const info = revealTokens.get(userId);
  if (!info) return false;
  if (Date.now() > info.expiresAt) return false;
  return info.token === token;
};

export const securityOverview = async (_req: Request, res: Response): Promise<void> => {
  const riskScore = await calculateRiskScore();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const attackCount24h = await prisma.attackLog.count({ where: { created_at: { gte: since24h } } });
  const level = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const attacks7d = await prisma.attackLog.findMany({ where: { created_at: { gte: since7d } } });
  const typeMap: Record<string, number> = {};
  const ipMap: Record<string, number> = {};
  attacks7d.forEach((i) => {
    typeMap[i.attack_type] = (typeMap[i.attack_type] ?? 0) + 1;
    ipMap[i.ip_address] = (ipMap[i.ip_address] ?? 0) + 1;
  });

  // 24h 趋势、24h 类型分布、24h 来源地 Top（真实来自 attack_log）
  const attacks24h = await prisma.attackLog.findMany({
    where: { created_at: { gte: since24h } },
    select: { created_at: true, attack_type: true, ip_address: true }
  });

  const now = new Date();
  const trendLabels: string[] = [];
  const trendValues: number[] = [];
  for (let i = 23; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    trendLabels.push(`${String(d.getHours()).padStart(2, '0')}:00`);
    trendValues.push(0);
  }
  const start0 = new Date(now.getTime() - 23 * 60 * 60 * 1000);
  attacks24h.forEach((a) => {
    const idx = Math.floor((a.created_at.getTime() - start0.getTime()) / (60 * 60 * 1000));
    if (idx >= 0 && idx < trendValues.length) trendValues[idx] += 1;
  });

  const norm = (ip: string): string => ip.replace('::ffff:', '');
  const isPrivate = (ip: string): boolean =>
    ip === '::1' || ip === '127.0.0.1' || ip.startsWith('10.') || ip.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
  const loc24 = (raw: string): string => {
    const ip = norm(raw);
    if (ip === '::1' || ip === '127.0.0.1') return '本机';
    if (isPrivate(ip)) return '内网';
    const g = geoip.lookup(ip);
    if (!g) return '未知';
    return (g.city || g.region || g.country) as string;
  };
  const type24Map: Record<string, number> = {};
  const locMap: Record<string, number> = {};
  attacks24h.forEach((a) => {
    type24Map[a.attack_type] = (type24Map[a.attack_type] ?? 0) + 1;
    const l = loc24(a.ip_address);
    locMap[l] = (locMap[l] ?? 0) + 1;
  });

  res.json({
    riskScore,
    level,
    attackCount24h,
    typeStats: Object.entries(typeMap).map(([name, value]) => ({ name, value })), // 7d
    typeStats24h: Object.entries(type24Map).map(([name, value]) => ({ name, value })), // 24h
    topIps: Object.entries(ipMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count })),
    trend24h: { labels: trendLabels, values: trendValues },
    topLocations24h: Object.entries(locMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value })),
    defenseEnabled: getSecurityState().defenseEnabled,
    bannedIps: getBannedIps()
  });
};

export const securityAttacks = async (req: Request, res: Response): Promise<void> => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const includeSim = String(req.query.includeSim ?? '').toLowerCase() === 'true';
  const whereBase = from || to ? { created_at: { gte: from, lte: to } } : {};
  const where = includeSim ? whereBase : { ...whereBase, NOT: { user_agent: 'simulator/1.0' } };
  const items = await prisma.attackLog.findMany({ where, orderBy: { created_at: 'desc' }, take: 200 });
  const norm = (ip: string): string => ip.replace('::ffff:', '');
  const isPrivate = (ip: string): boolean =>
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
  const loc = (raw: string): string => {
    const ip = norm(raw);
    if (ip === '::1' || ip === '127.0.0.1') return '本机';
    if (isPrivate(ip)) return '内网';
    const g = geoip.lookup(ip);
    if (!g) return '未知';
    const parts = [g.country, g.region, g.city].filter(Boolean);
    return parts.length ? parts.join(' ') : '未知';
  };
  res.json({
    items: items.map((i) => ({
      ...i,
      location: loc(String(i.ip_address ?? ''))
    }))
  });
};

export const securityLogs = async (_req: Request, res: Response): Promise<void> => {
  const items = await prisma.systemLog.findMany({ orderBy: { timestamp: 'desc' }, take: 200 });
  res.json({ items });
};

export const banIp = async (req: Request, res: Response): Promise<void> => {
  const ip = String(req.params.ip);
  banCrawlerIp(ip);
  await prisma.attackLog.create({
    data: {
      attack_type: 'manual_ban',
      ip_address: ip,
      path: '/api/admin/security/ban',
      severity: 'high',
      mitigation_action: 'ip_banned',
      status: 'blocked'
    }
  });
  res.json({ success: true, ip });
};

export const securitySettings = async (_req: Request, res: Response): Promise<void> => {
  res.json({ ...getSecurityState(), bannedIps: getBannedIps() });
};

export const toggleDefense = async (req: Request, res: Response): Promise<void> => {
  const enabled = Boolean(req.body?.enabled);
  setDefenseEnabled(enabled);
  res.json({ defenseEnabled: enabled });
};

export const toggleSecuritySwitches = async (req: Request, res: Response): Promise<void> => {
  setSecuritySwitches({
    userProtectionEnabled:
      typeof req.body?.userProtectionEnabled === 'boolean' ? Boolean(req.body.userProtectionEnabled) : undefined,
    antiCrawlerEnabled: typeof req.body?.antiCrawlerEnabled === 'boolean' ? Boolean(req.body.antiCrawlerEnabled) : undefined,
    chatEncryptionEnabled:
      typeof req.body?.chatEncryptionEnabled === 'boolean' ? Boolean(req.body.chatEncryptionEnabled) : undefined,
    idorProtectionEnabled:
      typeof req.body?.idorProtectionEnabled === 'boolean' ? Boolean(req.body.idorProtectionEnabled) : undefined,
    ssrfProtectionEnabled:
      typeof req.body?.ssrfProtectionEnabled === 'boolean' ? Boolean(req.body.ssrfProtectionEnabled) : undefined,
    traversalProtectionEnabled:
      typeof req.body?.traversalProtectionEnabled === 'boolean' ? Boolean(req.body.traversalProtectionEnabled) : undefined,
    configLeakProtectionEnabled:
      typeof req.body?.configLeakProtectionEnabled === 'boolean' ? Boolean(req.body.configLeakProtectionEnabled) : undefined
  });
  res.json(getSecurityState());
};

export const impactRevealToken = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Missing user' });
    return;
  }
  const token = issueRevealToken(userId);
  res.json({ token, expiresInSec: 60 });
};

export const impactReport = async (req: Request, res: Response): Promise<void> => {
  const sinceRaw = req.query.since ? new Date(String(req.query.since)) : new Date(Date.now() - 5 * 60 * 1000);
  const since = Number.isNaN(sinceRaw.getTime()) ? new Date(Date.now() - 5 * 60 * 1000) : sinceRaw;
  const includeSim = String(req.query.includeSim ?? '').toLowerCase() === 'true';

  const whereAttack = includeSim
    ? { created_at: { gte: since } }
    : { created_at: { gte: since }, NOT: { user_agent: 'simulator/1.0' } };

  const events = await prisma.attackLog.findMany({
    where: whereAttack,
    orderBy: { created_at: 'desc' },
    take: 200
  });

  const high = events.filter((e) => e.severity === 'high');
  const uniqueIps = Array.from(new Set(events.map((e) => e.ip_address)));
  const uniquePaths = Array.from(new Set(events.map((e) => e.path)));
  const uniqueTypes = Array.from(new Set(events.map((e) => e.attack_type)));

  const userCount = await prisma.user.count();
  const videoCount = await prisma.video.count();
  const latestVideos = await prisma.video.findMany({
    orderBy: { created_at: 'desc' },
    take: 6,
    select: { id: true, title: true, category: true, views: true, created_at: true, status: true }
  });
  const userSample = await prisma.user.findMany({
    orderBy: { created_at: 'desc' },
    take: 8,
    select: { id: true, email: true, username: true, role: true, status: true, created_at: true, last_login: true }
  });
  // 只有当“防御关闭且发生过数据外带成功”时，才允许进入“破解链路”演示
  const exfilSucceeded = await prisma.attackLog.count({
    where: {
      created_at: { gte: since },
      attack_type: 'data_exfil',
      path: '/api/leak/users',
      status: 'detected'
    }
  });

  const state = getSecurityState();
  const defenseEnabled = state.defenseEnabled; // WAF 是否拦截
  const userProtectionEnabled = state.userProtectionEnabled; // 敏感数据外带保护

  const maskEmail = (email: string): string => {
    const at = email.indexOf('@');
    if (at <= 1) return '***';
    const name = email.slice(0, at);
    const domain = email.slice(at);
    const head = name.slice(0, 1);
    const tail = name.slice(-1);
    return `${head}***${tail}${domain}`;
  };
  const mask = (s: string, keep = 2): string => {
    if (!s) return '';
    if (s.length <= keep * 2) return '*'.repeat(s.length);
    return `${s.slice(0, keep)}***${s.slice(-keep)}`;
  };

  const userSampleMasked = userSample.map((u) => ({
    ...u,
    email: maskEmail(String(u.email)),
    username: mask(String(u.username), 1)
  }));

  const authReq = req as AuthRequest;
  const revealToken = String(req.query.revealToken ?? '');
  const reveal = authReq.user?.id ? canReveal(authReq.user.id, revealToken) : false;

  const chain = [
    { step: '1. 探测入口', detail: '命中可疑参数/路径（WAF/威胁检测记录）' },
    { step: '2. 枚举资产', detail: '尝试遍历用户/视频等资源标识，收集公开与半公开字段' },
    { step: '3. 凭证攻击', detail: '对登录接口进行口令喷洒/暴破（触发锁定/告警）' },
    { step: '4. 权限提升', detail: '若存在越权或管理端弱点，可进一步获取管理能力' }
  ];

  const canCrackDemo = !userProtectionEnabled && exfilSucceeded > 0;
  const dictionary = ['123456', '12345678', 'password', 'qwerty', 'admin', 'Admin@123456', 'User@123456', '111111', '000000', 'letmein'];
  const crackTimeline: Array<{ t: number; kind: 'info' | 'try' | 'hit' | 'miss' | 'done'; msg: string }> = [];
  const crackResults: Array<any> = [];

  if (!canCrackDemo) {
    crackTimeline.push({
      t: 0,
      kind: 'info',
      msg: userProtectionEnabled
        ? '保护用户信息开启：敏感数据外带被阻断，无法获得 password_hash，因此无法进入破解阶段。'
        : '保护用户信息已关闭但尚未发生数据外带成功：请先完成外带步骤再演示破解。'
    });
    crackTimeline.push({ t: 1, kind: 'done', msg: '破解阶段跳过' });
  } else {
    const crackTargets = await prisma.user.findMany({
      orderBy: { last_login: 'desc' },
      take: 30,
      select: { id: true, email: true, username: true, role: true, status: true, password_hash: true }
    });
    const t0 = Date.now();
    for (const u of crackTargets) {
      let found = false;
      let foundPassword: string | undefined;
      let attempts = 0;
      for (const pwd of dictionary) {
        attempts += 1;
        crackTimeline.push({ t: Date.now() - t0, kind: 'try', msg: `尝试 ${u.email} / ${pwd}` });
        // eslint-disable-next-line no-await-in-loop
        const ok = await bcrypt.compare(pwd, u.password_hash);
        if (ok) {
          found = true;
          foundPassword = pwd;
          crackTimeline.push({ t: Date.now() - t0, kind: 'hit', msg: `命中：${u.email} => ${pwd}` });
          break;
        }
      }
      if (!found) crackTimeline.push({ t: Date.now() - t0, kind: 'miss', msg: `失败：${u.email}（字典未命中）` });
      crackResults.push({
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        status: u.status,
        found,
        foundPassword,
        attempts
      });
    }
    crackTimeline.push({ t: Date.now() - t0, kind: 'done', msg: '破解过程结束' });
  }

  res.json({
    since: since.toISOString(),
    defenseEnabled,
    revealEnabled: reveal,
    observed: {
      total: events.length,
      high: high.length,
      ips: uniqueIps.slice(0, 20),
      paths: uniquePaths.slice(0, 20),
      types: uniqueTypes
    },
    assets: {
      userCount,
      videoCount,
      userSample: reveal ? userSample : userSampleMasked,
      latestVideos
    },
    deep: {
      chain,
      whatCouldBeSeen: [
        '用户邮箱（脱敏示例）/用户名（脱敏示例）/角色/状态/最近登录时间',
        '视频标题/分类/播放量/发布时间',
        '入口路径与攻击类型分布（帮助攻击者挑选继续深入方向）'
      ],
      crackDemo: {
        method: 'dictionary + bcrypt.compare',
        dictionarySize: dictionary.length,
        enabled: canCrackDemo,
        results: reveal ? crackResults : crackResults.map((r: any) => ({ ...r, foundPassword: r.found ? '***' : undefined })),
        timeline: crackTimeline
      }
    },
    warning: defenseEnabled
      ? '当前为防御开启（WAF拦截）：上述攻击多数会被拦截，但仍建议修补漏洞端点与加强登录策略。'
      : '当前为仅记录（WAF不拦截）：若真实漏洞存在，攻击者可能进一步枚举信息、获取管理权限并扩大影响。'
  });
};

export const listUsers = async (_req: Request, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    orderBy: { created_at: 'desc' },
    select: { id: true, email: true, username: true, role: true, status: true, created_at: true, last_login: true }
  });
  res.json({ items: users });
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const { role, status } = req.body as { role?: 'admin' | 'user'; status?: 'active' | 'suspended' };
  if (!Number.isFinite(id)) {
    res.status(400).json({ message: 'Invalid user id' });
    return;
  }
  const user = await prisma.user.update({
    where: { id },
    data: {
      role: role ? role : undefined,
      status: status ? status : undefined
    },
    select: { id: true, email: true, username: true, role: true, status: true, created_at: true, last_login: true }
  });
  emitSecurityEvent({
    type: 'admin_action',
    ip: req.ip ?? 'unknown',
    path: `/api/admin/users/${id}`,
    detail: `管理员更新用户：role=${role ?? '-'} status=${status ?? '-'}`,
    level: 'low'
  });
  res.json({ user });
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const authReq = req as AuthRequest;
  if (!Number.isFinite(id)) {
    res.status(400).json({ message: 'Invalid user id' });
    return;
  }
  if (authReq.user?.id === id) {
    res.status(400).json({ message: '不能删除当前登录管理员账号' });
    return;
  }
  try {
    await prisma.user.delete({ where: { id } });
    emitSecurityEvent({
      type: 'admin_action',
      ip: req.ip ?? 'unknown',
      path: `/api/admin/users/${id}`,
      detail: '管理员删除用户',
      level: 'medium'
    });
    res.json({ success: true, id });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      res.status(409).json({ message: '该用户存在关联数据（投稿/评论/聊天等），暂不支持直接删除' });
      return;
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      res.status(404).json({ message: '用户不存在' });
      return;
    }
    throw e;
  }
};

export const simulateAttack = async (_req: Request, res: Response): Promise<void> => {
  const roundsRaw = Number(_req.body?.rounds ?? 10);
  const rounds = Number.isFinite(roundsRaw) ? Math.min(500, Math.max(1, Math.floor(roundsRaw))) : 10;
  const types = Array.isArray(_req.body?.types) ? (_req.body.types as string[]) : [];
  const enabled = getSecurityState().defenseEnabled;

  const now = Date.now();
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
  const randomIp = (): string => `203.0.113.${(Math.floor(Math.random() * 200) + 10) % 255}`;

  const library: Record<
    string,
    { path: string; severity: 'low' | 'medium' | 'high'; payloads: string[]; mitigation: string }
  > = {
    xss: {
      path: '/api/videos',
      severity: 'medium',
      payloads: [`<img src=x onerror=alert(1)>`, `\"><svg/onload=confirm(1)>`],
      mitigation: 'waf_xss_rule'
    },
    sql_injection: {
      path: '/api/security-demo/user',
      severity: 'high',
      payloads: [`1 OR 1=1 --`, `1 UNION SELECT password_hash FROM User --`],
      mitigation: 'waf_sql_rule'
    },
    csrf: {
      path: '/api/admin/security/toggle-defense',
      severity: 'low',
      payloads: [`<form action=\"/api/admin/security/toggle-defense\" method=\"POST\"></form>`],
      mitigation: 'csrf_origin_check'
    },
    bruteforce: {
      path: '/api/auth/login',
      severity: 'high',
      payloads: [`admin@securevideo.com:123456`, `user@securevideo.com:password`],
      mitigation: 'login_lockout'
    }
  };

  const selected = (types.length ? types : ['xss', 'sql_injection', 'csrf', 'bruteforce']).filter((t) => library[t]);
  const logs: Array<{
    attack_type: string;
    ip_address: string;
    user_agent?: string;
    path: string;
    payload?: string;
    severity: 'low' | 'medium' | 'high';
    mitigation_action: string;
    status: 'blocked' | 'detected';
  }> = [];

  let blockedCount = 0;
  let detectedCount = 0;
  // 保留字段给前端展示用（本模拟不产生 ignored）
  const ignoredCount = 0;

  for (let i = 0; i < rounds; i += 1) {
    const t = pick(selected);
    const spec = library[t]!;
    const ip = randomIp();
    const payload = pick(spec.payloads);
    const status = enabled ? ('blocked' as const) : ('detected' as const);
    if (status === 'blocked') blockedCount += 1;
    if (status === 'detected') detectedCount += 1;
    logs.push({
      attack_type: t,
      ip_address: ip,
      user_agent: 'simulator/1.0',
      path: spec.path,
      payload,
      severity: spec.severity,
      mitigation_action: enabled ? `${spec.mitigation}_blocked` : `${spec.mitigation}_logged`,
      status
    });
  }

  await prisma.attackLog.createMany({ data: logs });

  const sample = logs.slice(-Math.min(12, logs.length));
  sample.forEach((l, idx) => {
    emitSecurityEvent({
      type: l.attack_type,
      ip: l.ip_address,
      path: l.path,
      detail: `${enabled ? '拦截' : '记录'}：${l.payload ?? ''}`.slice(0, 160),
      level: l.severity
    });
    if (idx === sample.length - 1) {
      emitSecurityEvent({
        type: 'batch',
        ip: l.ip_address,
        path: '/api/admin/security/simulate-attack',
        detail: `模拟攻击批次完成：rounds=${rounds} blocked=${blockedCount} detected=${detectedCount}`,
        level: enabled ? 'low' : 'medium'
      });
    }
  });

  const breach = !enabled && logs.some((l) => l.severity === 'high') && now % 2 === 0;

  const keyHint = 0;
  const b64 = (s: string): string => Buffer.from(s, 'utf8').toString('base64');
  const compromised = breach
    ? {
        decryptNote: '演示：当防御关闭时，高危攻击可能造成敏感信息泄露（此处为模拟数据）。',
        tokenLeakSample: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo.demo',
        keyHint,
        credentialsEncrypted: [
          { role: 'admin', emailEnc: b64('admin@securevideo.com'), usernameEnc: b64('admin'), passwordEnc: b64('Admin@123456') },
          { role: 'user', emailEnc: b64('user@securevideo.com'), usernameEnc: b64('user'), passwordEnc: b64('User@123456') }
        ]
      }
    : null;

  res.json({
    rounds,
    types: selected,
    defenseEnabled: enabled,
    blockedCount,
    detectedCount,
    ignoredCount,
    breach,
    compromised
  });
};
