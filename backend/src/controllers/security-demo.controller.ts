import { Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../config/prisma';
import { emitSecurityEvent } from '../services/realtime.service';
import { getSecurityState } from '../services/security-state.service';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env';

const upload = multer({ storage: multer.memoryStorage() });
export const uploadSingle = upload.single('file');
const CHAT_ENC_PREFIX = 'ENC::v1::';
const isChatEncrypted = (raw: string): boolean => String(raw ?? '').startsWith(CHAT_ENC_PREFIX);

// 外带接口：不做解密，只区分明文/密文展示（密文直接返回 storedContent）
const leakChatPlaintextField = (raw: string): { plaintext: string; isEncryptedStorage: boolean } => {
  const encrypted = isChatEncrypted(raw);
  return { plaintext: encrypted ? '' : String(raw ?? ''), isEncryptedStorage: encrypted };
};

const deriveChatKey = (): Buffer => crypto.createHash('sha256').update(String(env.jwtSecret)).digest(); // 32 bytes
const leakEncrypt = (plain: string): string => {
  const key = deriveChatKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(String(plain ?? ''), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${CHAT_ENC_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
};

const isAllowedVideoOrImage = (buffer: Buffer): boolean => {
  const hex = buffer.subarray(0, 12).toString('hex');
  const jpg = hex.startsWith('ffd8ff');
  const png = hex.startsWith('89504e470d0a1a0a');
  const mp4 = hex.includes('66747970');
  return jpg || png || mp4;
};

const DEMO_SECRETS = {
  dbPassword: 'demo-db-password-DO_NOT_USE',
  jwtSecretHint: 'demo-jwt-secret-hint',
  apiKey: 'sk_demo_51xxxxx',
  internalToken: 'int_demo_token_xxxxx'
};

export const vulnerableUserApi = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.query.id ?? '1');
  const attack = /(and|or|=|--|union|select)/i.test(id);
  if (attack) {
    await prisma.attackLog.create({
      data: {
        attack_type: 'sql_injection',
        ip_address: req.ip ?? 'unknown',
        path: '/api/user',
        payload: id,
        severity: 'high',
        mitigation_action: 'vuln_endpoint_detected',
        status: 'detected'
      }
    });
    emitSecurityEvent({
      type: 'vulnerability_exploited',
      ip: req.ip ?? 'unknown',
      path: '/api/user',
      detail: `原始请求id=${id} -> 恶意payload -> 防护动作`,
      level: 'high'
    });
  }
  res.json({ id, name: 'demo_user', safe: !attack });
};

export const leakConfigSecrets = async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip ?? 'unknown';
  const state = getSecurityState();
  const blocked = state.configLeakProtectionEnabled;
  await prisma.attackLog.create({
    data: {
      attack_type: 'config_leak',
      ip_address: ip,
      user_agent: req.headers['user-agent'],
      path: '/api/leak/config-secrets',
      payload: 'attempt=config_secrets',
      severity: 'high',
      mitigation_action: blocked ? 'config_leak_blocked' : 'config_leak_succeeded',
      status: blocked ? 'blocked' : 'detected'
    }
  });
  if (blocked) {
    res.status(403).json({ message: 'Config leak blocked' });
    return;
  }
  res.json({
    leaked: true,
    secrets: {
      dbPassword: DEMO_SECRETS.dbPassword,
      apiKey: DEMO_SECRETS.apiKey,
      internalToken: DEMO_SECRETS.internalToken,
      // 不直接泄露真实密钥：仅返回 hint
      jwtSecretHint: DEMO_SECRETS.jwtSecretHint
    },
    note: '演示数据：用于授权演练与合规审计'
  });
};

export const leakIdorProfile = async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip ?? 'unknown';
  const state = getSecurityState();
  const blocked = state.idorProtectionEnabled;
  const userId = Number(req.query.userId ?? 1);
  const victimId = Number.isFinite(userId) ? userId : 1;

  await prisma.attackLog.create({
    data: {
      attack_type: 'idor',
      ip_address: ip,
      user_agent: req.headers['user-agent'],
      path: '/api/leak/idor-profile',
      payload: `userId=${victimId}`,
      severity: 'high',
      mitigation_action: blocked ? 'idor_blocked' : 'idor_succeeded',
      status: blocked ? 'blocked' : 'detected'
    }
  });
  if (blocked) {
    res.status(403).json({ message: 'IDOR blocked' });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: victimId },
    select: { id: true, email: true, username: true, role: true, status: true, last_login: true }
  });
  res.json({
    leaked: true,
    user: user ?? { id: victimId, email: 'unknown', username: 'unknown', role: 'user', status: 'active', last_login: null },
    simulatedSensitive: { resetToken: `reset_${victimId}_${DEMO_SECRETS.internalToken.slice(0, 8)}` }
  });
};

export const leakSsrf = async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip ?? 'unknown';
  const state = getSecurityState();
  const blocked = state.ssrfProtectionEnabled;
  const url = String(req.query.url ?? '').trim();
  await prisma.attackLog.create({
    data: {
      attack_type: 'ssrf',
      ip_address: ip,
      user_agent: req.headers['user-agent'],
      path: '/api/leak/ssrf',
      payload: url.slice(0, 800),
      severity: 'high',
      mitigation_action: blocked ? 'ssrf_blocked' : 'ssrf_succeeded',
      status: blocked ? 'blocked' : 'detected'
    }
  });
  if (blocked) {
    res.status(403).json({ message: 'SSRF blocked' });
    return;
  }
  const looksLikeMeta = /169\.254\.169\.254|metadata/i.test(url);
  res.json({
    leaked: true,
    requestedUrl: url,
    internal: looksLikeMeta
      ? {
          provider: 'demo-cloud',
          instanceId: 'i-demo123456',
          iamRole: 'demo-role',
          accessKeyId: 'AKIADEMO123456',
          secretAccessKey: 'demo_secret_access_key',
          token: DEMO_SECRETS.internalToken
        }
      : { note: '演示：仅对云元数据URL返回模拟敏感信息' }
  });
};

export const leakFileRead = async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip ?? 'unknown';
  const state = getSecurityState();
  const blocked = state.traversalProtectionEnabled;
  const path = String(req.query.path ?? '').trim();
  await prisma.attackLog.create({
    data: {
      attack_type: 'path_traversal',
      ip_address: ip,
      user_agent: req.headers['user-agent'],
      path: '/api/leak/file-read',
      payload: path.slice(0, 800),
      severity: 'high',
      mitigation_action: blocked ? 'traversal_blocked' : 'traversal_succeeded',
      status: blocked ? 'blocked' : 'detected'
    }
  });
  if (blocked) {
    res.status(403).json({ message: 'Traversal blocked' });
    return;
  }
  const lower = path.toLowerCase();
  if (lower.includes('passwd')) {
    res.json({ leaked: true, file: '/etc/passwd', content: 'root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n' });
    return;
  }
  if (lower.includes('.env') || lower.includes('env')) {
    res.json({
      leaked: true,
      file: '.env',
      content: `DB_PASSWORD=${DEMO_SECRETS.dbPassword}\nJWT_SECRET=${DEMO_SECRETS.jwtSecretHint}\nAPI_KEY=${DEMO_SECRETS.apiKey}\n`
    });
    return;
  }
  res.json({ leaked: true, file: path || '(empty)', content: 'demo file content (no sensitive match)' });
};

export const honeypotAdmin = async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip ?? 'unknown';
  await prisma.attackLog.create({
    data: {
      attack_type: 'honeypot_hit',
      ip_address: ip,
      user_agent: req.headers['user-agent'],
      path: '/admin-test',
      payload: JSON.stringify(req.body).slice(0, 800),
      severity: 'medium',
      mitigation_action: 'honeypot_tracked',
      status: 'detected'
    }
  });
  emitSecurityEvent({ type: 'honeypot', ip, path: '/admin-test', detail: '蜜罐捕获可疑访问', level: 'medium' });
  res.status(401).json({ message: 'Unauthorized admin test endpoint' });
};

export const uploadGuardedFile = async (req: Request, res: Response): Promise<void> => {
  const f = req.file;
  if (!f) {
    res.status(400).json({ message: 'No file' });
    return;
  }
  const valid = isAllowedVideoOrImage(f.buffer);
  if (!valid) {
    await prisma.attackLog.create({
      data: {
        attack_type: 'malicious_upload',
        ip_address: req.ip ?? 'unknown',
        path: '/api/videos/upload-file',
        payload: f.originalname,
        severity: 'high',
        mitigation_action: 'file_header_blocked',
        status: 'blocked'
      }
    });
    emitSecurityEvent({
      type: 'upload_attack',
      ip: req.ip ?? 'unknown',
      path: '/api/videos/upload-file',
      detail: `上传伪装文件 ${f.originalname} 被拦截`,
      level: 'high'
    });
    res.status(400).json({ message: '文件类型校验失败' });
    return;
  }
  res.json({ success: true, filename: f.originalname, size: f.size });
};

export const leakUsers = async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip ?? 'unknown';
  const enabled = getSecurityState().userProtectionEnabled;

  // 防御开启：阻断数据外带
  if (enabled) {
    await prisma.attackLog.create({
      data: {
        attack_type: 'data_exfil',
        ip_address: ip,
        user_agent: req.headers['user-agent'],
        path: '/api/leak/users',
        payload: 'attempt=list_users_with_hash',
        severity: 'high',
        mitigation_action: 'exfil_blocked',
        status: 'blocked'
      }
    });
    emitSecurityEvent({ type: 'data_exfil', ip, path: '/api/leak/users', detail: '数据外带尝试已拦截', level: 'high' });
    res.status(403).json({ message: 'Exfiltration blocked' });
    return;
  }

  // 防御关闭：演示“漏洞导致可枚举敏感字段”（此处为授权演示）
  const users = await prisma.user.findMany({
    orderBy: { created_at: 'desc' },
    take: 10,
    select: { id: true, email: true, username: true, role: true, status: true, password_hash: true }
  });

  await prisma.attackLog.create({
    data: {
      attack_type: 'data_exfil',
      ip_address: ip,
      user_agent: req.headers['user-agent'],
      path: '/api/leak/users',
      payload: `rows=${users.length}`,
      severity: 'high',
      mitigation_action: 'exfil_succeeded',
      status: 'detected'
    }
  });
  emitSecurityEvent({ type: 'data_exfil', ip, path: '/api/leak/users', detail: `数据外带成功 rows=${users.length}`, level: 'high' });

  res.json({ items: users });
};

export const leakCrawlerInfo = async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip ?? 'unknown';
  const state = getSecurityState();
  if (state.antiCrawlerEnabled) {
    await prisma.attackLog.create({
      data: {
        attack_type: 'crawler_exfil',
        ip_address: ip,
        user_agent: req.headers['user-agent'],
        path: '/api/leak/crawler-info',
        payload: 'blocked_by=antiCrawlerEnabled',
        severity: 'high',
        mitigation_action: 'crawler_exfil_blocked',
        status: 'blocked'
      }
    });
    res.status(403).json({ message: 'Anti-crawler enabled: blocked' });
    return;
  }
  const items = await prisma.content.findMany({
    orderBy: { created_at: 'desc' },
    take: 120,
    select: {
      id: true,
      type: true,
      title: true,
      summary: true,
      body: true,
      cover_url: true,
      media_url: true,
      status: true,
      views: true,
      created_at: true,
      author: { select: { id: true, username: true } },
      category: { select: { id: true, name: true, slug: true } }
    }
  });

  const parseUrlList = (raw: unknown): string[] => {
    const s = String(raw ?? '').trim();
    if (!s) return [];
    // 1) JSON array
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) return arr.map((x) => String(x ?? '').trim()).filter(Boolean);
      } catch {
        // fall through
      }
    }
    // 2) split by comma / newline / spaces
    const parts = s.split(/[\r\n,]+/g).map((x) => x.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
    // 3) try parse from body if it looks like JSON containing urls
    return parts;
  };
  const grouped = {
    video: items
      .filter((x) => x.type === 'video')
      .map((x) => ({
        ...x,
        downloadUrl: x.media_url || x.cover_url || '',
        imageCount: x.cover_url ? 1 : 0
      })),
    image: items
      .filter((x) => x.type === 'image')
      .map((x) => ({
        ...x,
        imageUrls: parseUrlList(x.media_url || x.cover_url || ''),
        downloadUrl: parseUrlList(x.media_url || x.cover_url || '')[0] || '',
        imageCount: parseUrlList(x.media_url || x.cover_url || '').length
      })),
    article: items
      .filter((x) => x.type === 'article')
      .map((x) => ({
        ...x,
        wordLikePages: Math.max(1, Math.ceil(String(x.body ?? '').length / 1200))
      }))
  };
  await prisma.attackLog.create({
    data: {
      attack_type: 'crawler_exfil',
      ip_address: ip,
      user_agent: req.headers['user-agent'],
      path: '/api/leak/crawler-info',
      payload: `video=${grouped.video.length},image=${grouped.image.length},article=${grouped.article.length}`,
      severity: 'high',
      mitigation_action: 'crawler_exfil_succeeded',
      status: 'detected'
    }
  });
  res.json({
    total: items.length,
    groups: grouped,
    counts: { video: grouped.video.length, image: grouped.image.length, article: grouped.article.length },
    detail: {
      videoNames: grouped.video.map((x) => x.title),
      imageNames: grouped.image.map((x) => x.title),
      articleNames: grouped.article.map((x) => x.title)
    }
  });
};

export const leakChatPlaintext = async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip ?? 'unknown';
  const state = getSecurityState();
  const rawMessages = await prisma.chatMessage.findMany({
    orderBy: { created_at: 'desc' },
    take: 100,
    include: {
      sender: { select: { id: true, username: true } },
      friendship: { select: { id: true, user_low_id: true, user_high_id: true } }
    }
  });
  const containsEncrypted = rawMessages.filter((x) => isChatEncrypted(x.content)).length;
  const items = rawMessages.map((m) => {
    const f = leakChatPlaintextField(m.content);
    return {
      id: m.id,
      friendship_id: m.friendship_id,
      sender: m.sender,
      created_at: m.created_at,
      storedContent: state.chatEncryptionEnabled && !f.isEncryptedStorage ? leakEncrypt(f.plaintext) : m.content,
      plaintext: f.plaintext,
      isEncryptedStorage: f.isEncryptedStorage
    };
  });
  await prisma.attackLog.create({
    data: {
      attack_type: 'chat_exfil',
      ip_address: ip,
      user_agent: req.headers['user-agent'],
      path: '/api/leak/chat-plaintext',
      payload: `rows=${items.length},encryptedRows=${containsEncrypted}`,
      severity: 'high',
      mitigation_action: state.chatEncryptionEnabled ? 'chat_encrypted_only' : 'chat_plaintext_leaked',
      status: 'detected'
    }
  });
  res.json({
    encryptionEnabled: state.chatEncryptionEnabled,
    plaintextLeakable: !state.chatEncryptionEnabled,
    total: items.length,
    // 加密开启时：仍可获取到对话流，但仅对“已加密存储”的消息隐藏明文；未加密存储的消息仍会暴露（用于演示“历史数据未加密”的风险）
    items: state.chatEncryptionEnabled
      ? items.map((x) => ({
          ...x,
          // 外带视角：加密开启时展示“乱码/密文”，即使是历史明文也会被加密后返回
          plaintext: '',
          isEncryptedStorage: true,
          note: '密文（外带视角：加密开启时仅能获取密文）'
        }))
      : items
  });
};

export const crackHashes = async (req: Request, res: Response): Promise<void> => {
  const targetsRaw = Array.isArray(req.body?.targets) ? (req.body.targets as Array<{ email?: string; hash?: string }>) : [];
  const targets = targetsRaw
    .map((t, idx) => ({
      email: String(t?.email ?? '').trim() || `target-${idx + 1}`,
      hash: String(t?.hash ?? '').trim()
    }))
    .filter((t) => t.hash);
  const dictionary = Array.isArray(req.body?.dictionary) ? (req.body.dictionary as string[]) : [];
  const modeRaw = String(req.body?.mode ?? 'dictionary').trim().toLowerCase();
  const mode = modeRaw === 'bruteforce' ? 'bruteforce' : 'dictionary';
  const bruteLenRaw = Number(req.body?.bruteLen ?? req.body?.maxLen ?? 6);
  const bruteLen = Number.isFinite(bruteLenRaw) ? Math.min(8, Math.max(4, Math.floor(bruteLenRaw))) : 6;
  const bruteStartRaw = req.body?.bruteStart;
  const bruteEndRaw = req.body?.bruteEnd;
  const bruteCharsetRaw = String(req.body?.bruteCharset ?? '').trim();
  const bruteCharset = Array.from(new Set(bruteCharsetRaw.split(''))).join('');
  const usePreset = Boolean(req.body?.usePreset);
  const hasExplicitRange = String(bruteStartRaw ?? '').trim() !== '' || String(bruteEndRaw ?? '').trim() !== '';
  const maxAttemptsRaw = Number(req.body?.maxAttemptsPerTarget ?? 350000);
  const maxAttemptsPerTarget = Number.isFinite(maxAttemptsRaw) ? Math.min(1000000, Math.max(10000, Math.floor(maxAttemptsRaw))) : 350000;

  const dict = dictionary.length
    ? dictionary.slice(0, 5000).map((x) => String(x ?? '').trim()).filter(Boolean)
    : [
        '123456',
        '12345678',
        '123123',
        '123456789',
        'password',
        'qwerty',
        'admin',
        'admin123',
        'admin123456',
        'Admin@123456',
        'User@123456',
        '111111',
        '000000',
        '666666',
        '888888',
        'letmein',
        'iloveyou',
        'abc123',
        'test123'
      ];
  const dictFingerprint = crypto.createHash('sha1').update(dict.join('\n'), 'utf8').digest('hex').slice(0, 10);
  const dictMeta = req.body?.dictionaryMeta as { name?: string; fingerprint?: string; loadedAt?: number } | undefined;
  const usedDictionary =
    mode === 'dictionary'
      ? {
          source: dictionary.length ? 'custom' : 'default',
          size: dict.length,
          fingerprint: dictionary.length ? String(dictMeta?.fingerprint ?? dictFingerprint) : dictFingerprint,
          name: dictionary.length ? String(dictMeta?.name ?? 'custom.txt') : 'builtin'
        }
      : null;

  const timeline: Array<{ kind: 'try' | 'hit' | 'miss' | 'done' | 'info'; msg: string }> = [];
  const results: Array<{ email: string; found: boolean; foundPassword?: string; attempts: number; method: 'dictionary' | 'bruteforce' }> = [];
  const pushTimeline = (entry: { kind: 'try' | 'hit' | 'miss' | 'done' | 'info'; msg: string }) => {
    if (timeline.length < 320) timeline.push(entry);
  };
  const pushTryLog = (email: string, pwd: string, attempts: number) => {
    // 控制日志体积，避免暴力模式下输出过长导致前端卡顿
    if (attempts <= 8 || attempts % 5000 === 0) {
      pushTimeline({ kind: 'try', msg: `尝试 ${email} / ${pwd}${attempts > 8 ? `（第${attempts}次）` : ''}` });
    }
  };

  const crackByDictionary = async (
    email: string,
    hash: string
  ): Promise<{ found: boolean; foundPassword?: string; attempts: number; reason?: 'not_found' }> => {
    let attempts = 0;
    for (const pwd of dict) {
      attempts += 1;
      pushTryLog(email, pwd, attempts);
      // eslint-disable-next-line no-await-in-loop
      const ok = await bcrypt.compare(pwd, hash);
      if (ok) return { found: true, foundPassword: pwd, attempts };
    }
    return { found: false, attempts, reason: 'not_found' };
  };

  const crackByBruteforce = async (
    email: string,
    hash: string
  ): Promise<{ found: boolean; foundPassword?: string; attempts: number; reason?: 'not_found' | 'limit_before_range_done' | 'limit_before_charset_done' }> => {
    let attempts = 0;
    const seen = new Set<string>();
    const tryPassword = async (pwd: string): Promise<string | null> => {
      if (attempts >= maxAttemptsPerTarget) return null;
      if (seen.has(pwd)) return null;
      seen.add(pwd);
      attempts += 1;
      pushTryLog(email, pwd, attempts);
      // eslint-disable-next-line no-await-in-loop
      const ok = await bcrypt.compare(pwd, hash);
      return ok ? pwd : null;
    };

    // 固定范围优先：明确尊重用户输入范围
    const upper = 10 ** bruteLen;
    const parseBound = (v: unknown): number | null => {
      if (typeof v === 'number' && Number.isFinite(v)) return Math.floor(v);
      const s = String(v ?? '').trim();
      if (!s) return null;
      if (!/^\d+$/.test(s)) return null;
      return Number(s);
    };
    let start = parseBound(bruteStartRaw);
    let end = parseBound(bruteEndRaw);
    if (start == null) start = 0;
    if (end == null) end = upper - 1;
    start = Math.max(0, Math.min(upper - 1, start));
    end = Math.max(0, Math.min(upper - 1, end));
    if (start > end) [start, end] = [end, start];
    // 可选预设弱口令（仅在启用时先跑，默认不干扰范围）
    if (usePreset) {
      pushTimeline({ kind: 'info', msg: `预设阶段：先尝试重复数字（111111/222222...）` });
      for (let d = 1; d <= 9; d += 1) {
        // eslint-disable-next-line no-await-in-loop
        const hit = await tryPassword(String(d).repeat(bruteLen));
        if (hit) return { found: true, foundPassword: hit, attempts };
      }
      // eslint-disable-next-line no-await-in-loop
      const hit0 = await tryPassword('0'.repeat(bruteLen));
      if (hit0) return { found: true, foundPassword: hit0, attempts };
    }

    pushTimeline({ kind: 'info', msg: `范围阶段：尝试数字 ${String(start).padStart(bruteLen, '0')}~${String(end).padStart(bruteLen, '0')}` });

    let rangeCompleted = true;
    for (let i = start; i <= end; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const hit = await tryPassword(String(i).padStart(bruteLen, '0'));
      if (hit) return { found: true, foundPassword: hit, attempts };
      if (attempts >= maxAttemptsPerTarget) {
        rangeCompleted = false;
        break;
      }
    }
    if (!rangeCompleted) {
      return { found: false, attempts, reason: 'limit_before_range_done' };
    }

    // 数字范围跑完仍未命中，则继续尝试自定义字符集（固定 bruteLen 位）
    if (bruteCharset) {
      pushTimeline({ kind: 'info', msg: `数字范围未命中，继续尝试自定义字符集（${bruteCharset.length}个字符）` });
      const radix = bruteCharset.length;
      const total = Math.min(10 ** 6, radix ** bruteLen);
      let charsetCompleted = true;
      for (let n = 0; n < total; n += 1) {
        if (attempts >= maxAttemptsPerTarget) {
          charsetCompleted = false;
          break;
        }
        let x = n;
        let pwd = '';
        for (let i = 0; i < bruteLen; i += 1) {
          pwd = bruteCharset[x % radix] + pwd;
          x = Math.floor(x / radix);
        }
        // eslint-disable-next-line no-await-in-loop
        const hit = await tryPassword(pwd);
        if (hit) return { found: true, foundPassword: hit, attempts };
      }
      if (!charsetCompleted) return { found: false, attempts, reason: 'limit_before_charset_done' };
    }
    return { found: false, attempts, reason: 'not_found' };
  };

  pushTimeline({
    kind: 'info',
    msg:
      mode === 'dictionary'
        ? `破解模式：字典（字典${dict.length}条，目标${targets.length}个，指纹${usedDictionary?.fingerprint ?? dictFingerprint}）`
        : `破解模式：暴力（数字${bruteLen}位，${usePreset ? '启用' : '关闭'}预设，${hasExplicitRange ? '按固定范围优先' : '全范围'}，单目标最多${maxAttemptsPerTarget}次）`
  });

  for (const t of targets.slice(0, 100)) {
    const outcome =
      mode === 'dictionary' ? await crackByDictionary(t.email, t.hash) : await crackByBruteforce(t.email, t.hash);
    if (outcome.found) {
      pushTimeline({ kind: 'hit', msg: `命中：${t.email} => ${outcome.foundPassword}` });
    } else {
      const missReason =
        mode === 'dictionary'
          ? '字典未命中'
          : outcome.reason === 'limit_before_range_done'
            ? '达到尝试上限（数字范围尚未跑完）'
            : outcome.reason === 'limit_before_charset_done'
              ? '达到尝试上限（字符集枚举尚未跑完）'
              : '数字暴力与字符集均未命中';
      pushTimeline({
        kind: 'miss',
        msg: `失败：${t.email}（${missReason}）`
      });
    }
    results.push({ email: t.email, found: outcome.found, foundPassword: outcome.foundPassword, attempts: outcome.attempts, method: mode });
  }
  const successCount = results.filter((r) => r.found).length;
  const failCount = results.length - successCount;
  pushTimeline({ kind: 'done', msg: `破解过程结束：成功 ${successCount} / 失败 ${failCount}` });

  res.json({
    mode,
    dictionarySize: dict.length,
    usedDictionary,
    bruteLen,
    bruteStart: bruteStartRaw ?? null,
    bruteEnd: bruteEndRaw ?? null,
    bruteCharset: bruteCharset || null,
    usePreset,
    maxAttemptsPerTarget,
    targetCount: results.length,
    successCount,
    failCount,
    results,
    timeline
  });
};
