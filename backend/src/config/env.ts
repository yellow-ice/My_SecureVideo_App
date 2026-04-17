import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? 'change-me',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  disableBruteforce:
    String(process.env.DISABLE_BRUTEFORCE ?? '').trim().toLowerCase() === '1' ||
    String(process.env.DISABLE_BRUTEFORCE ?? '').trim().toLowerCase() === 'true',
  demoAdminEmail: process.env.DEMO_ADMIN_EMAIL ?? 'admin@securevideo.com',
  demoAdminPassword: process.env.DEMO_ADMIN_PASSWORD ?? 'Admin@123456',
  demoUserEmail: process.env.DEMO_USER_EMAIL ?? 'user@securevideo.com',
  demoUserPassword: process.env.DEMO_USER_PASSWORD ?? 'User@123456'
};
