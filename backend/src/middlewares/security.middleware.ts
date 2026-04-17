import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  // 本机/开发环境不做全局限流，避免联调时 429
  skip: () => env.nodeEnv === 'development' || env.disableBruteforce
});
