import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { redis } from './config/redis';
import { createServer } from 'http';
import { initRealtimeServer } from './services/realtime.service';

const bootstrap = async (): Promise<void> => {
  try {
    await redis.connect();
    logger.info('Redis connected');
  } catch {
    logger.warn('Redis connection failed, running without cache');
  }
  const server = createServer(app);
  initRealtimeServer(server);
  server.listen(env.port, () => {
    logger.info(`Server started on port ${env.port}`);
  });
};

void bootstrap();
