import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { redis } from './config/redis';
import { createServer } from 'http';
import { initRealtimeServer } from './services/realtime.service';

const bootstrap = async (): Promise<void> => {
  // #region agent log
  fetch('http://127.0.0.1:7763/ingest/f7634983-5a77-4a9d-a744-81ae45180aea',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1a4728'},body:JSON.stringify({sessionId:'1a4728',runId:'pre-fix',hypothesisId:'H1-H5',location:'src/server.ts:10',message:'Bootstrap start',data:{port:env.port,hasRedisUrl:Boolean(env.redisUrl)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  try {
    await redis.connect();
    // #region agent log
    fetch('http://127.0.0.1:7763/ingest/f7634983-5a77-4a9d-a744-81ae45180aea',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1a4728'},body:JSON.stringify({sessionId:'1a4728',runId:'pre-fix',hypothesisId:'H1-H2',location:'src/server.ts:15',message:'Redis connected in bootstrap',data:{status:'connected'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    logger.info('Redis connected');
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7763/ingest/f7634983-5a77-4a9d-a744-81ae45180aea',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1a4728'},body:JSON.stringify({sessionId:'1a4728',runId:'pre-fix',hypothesisId:'H1-H4',location:'src/server.ts:20',message:'Redis connect failed in bootstrap',data:{name:error instanceof Error ? error.name : 'unknown',message:error instanceof Error ? error.message : 'unknown'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    logger.warn('Redis connection failed, running without cache');
  }
  const server = createServer(app);
  initRealtimeServer(server);
  server.listen(env.port, () => {
    logger.info(`Server started on port ${env.port}`);
  });
};

void bootstrap();
