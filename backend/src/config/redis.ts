import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.redisUrl, { lazyConnect: true });

// #region agent log
fetch('http://127.0.0.1:7763/ingest/f7634983-5a77-4a9d-a744-81ae45180aea',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1a4728'},body:JSON.stringify({sessionId:'1a4728',runId:'pre-fix',hypothesisId:'H1-H3',location:'src/config/redis.ts:6',message:'Redis client created',data:{redisUrlDefined:Boolean(env.redisUrl),redisHostHint:env.redisUrl.includes('localhost')?'localhost':'remote'},timestamp:Date.now()})}).catch(()=>{});
// #endregion

redis.on('error', (error) => {
  // #region agent log
  fetch('http://127.0.0.1:7763/ingest/f7634983-5a77-4a9d-a744-81ae45180aea',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1a4728'},body:JSON.stringify({sessionId:'1a4728',runId:'pre-fix',hypothesisId:'H1-H4',location:'src/config/redis.ts:11',message:'Redis error event',data:{name:error?.name ?? 'unknown',message:error?.message ?? 'unknown'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
});

redis.on('reconnecting', (time) => {
  // #region agent log
  fetch('http://127.0.0.1:7763/ingest/f7634983-5a77-4a9d-a744-81ae45180aea',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1a4728'},body:JSON.stringify({sessionId:'1a4728',runId:'pre-fix',hypothesisId:'H2-H4',location:'src/config/redis.ts:18',message:'Redis reconnecting',data:{nextRetryDelayMs:time},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
});
