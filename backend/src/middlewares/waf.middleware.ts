import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { getSecurityState } from '../services/security-state.service';
import { emitSecurityEvent } from '../services/realtime.service';

const MALICIOUS_RULES: Array<{ type: string; level: 'medium' | 'high'; reg: RegExp }> = [
  { type: 'xss', level: 'high', reg: /<script|onerror=|javascript:/i },
  { type: 'sql_injection', level: 'high', reg: /\b(union|select|drop|or 1=1|--)\b/i },
  { type: 'path_traversal', level: 'high', reg: /\.\.\/|\/etc\/passwd/i }
];

export const wafMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const text = JSON.stringify({ body: req.body, query: req.query, path: req.path });
  const hit = MALICIOUS_RULES.find((r) => r.reg.test(text));
  if (!hit) {
    next();
    return;
  }

  const ip = req.ip ?? 'unknown';
  const state = getSecurityState();
  const blocked = state.wafBlockEnabled;
  await prisma.attackLog.create({
    data: {
      attack_type: hit.type,
      ip_address: ip,
      user_agent: req.headers['user-agent'],
      path: req.path,
      payload: text.slice(0, 1200),
      severity: hit.level,
      mitigation_action: blocked ? 'waf_blocked' : 'waf_observe',
      status: blocked ? 'blocked' : 'detected'
    }
  });
  emitSecurityEvent({
    type: hit.type,
    ip,
    path: req.path,
    detail: blocked ? 'WAF拦截恶意输入' : 'WAF观测到恶意输入（安全模式关闭）',
    level: hit.level
  });

  if (blocked) {
    res.status(403).json({ message: '安全系统检测到恶意输入，已阻断', rule: hit.type });
    return;
  }
  next();
};
