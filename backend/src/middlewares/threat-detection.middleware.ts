import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { getSecurityState } from '../services/security-state.service';
import { emitSecurityEvent } from '../services/realtime.service';

const detectAttackType = (payload: string): { type: string; severity: 'high' | 'medium' | 'low' } | null => {
  if (/(\bunion\b|\bselect\b|\bdrop\b|\bor 1=1\b)/i.test(payload)) return { type: 'sql_injection', severity: 'high' };
  if (/(<script|onerror=|javascript:)/i.test(payload)) return { type: 'xss', severity: 'high' };
  if (/(csrf|token=none|forged_request)/i.test(payload)) return { type: 'csrf', severity: 'medium' };
  if (/(admin.*123456|password.*123456|bruteforce)/i.test(payload)) return { type: 'bruteforce', severity: 'medium' };
  return null;
};

export const threatDetection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const state = getSecurityState();
  const payload = JSON.stringify({ body: req.body, query: req.query, params: req.params }).slice(0, 1500);
  const detected = detectAttackType(`${req.path} ${payload}`);
  if (!detected) {
    next();
    return;
  }

  const blocked = state.defenseEnabled;
  const ip = req.ip ?? 'unknown';
  await prisma.attackLog.create({
    data: {
      attack_type: detected.type,
      ip_address: ip,
      user_agent: req.headers['user-agent'],
      path: req.path,
      payload,
      severity: detected.severity,
      mitigation_action: blocked ? 'blocked_by_demo_waf' : 'logged_only',
      status: blocked ? 'blocked' : 'detected'
    }
  });
  emitSecurityEvent({
    type: detected.type,
    ip,
    path: req.path,
    detail: blocked ? '威胁检测拦截（规则命中）' : '威胁检测记录（安全模式关闭）',
    level: detected.severity
  });

  if (blocked) {
    res.status(403).json({ message: 'Request blocked by security policy', attackType: detected.type });
    return;
  }

  next();
};
