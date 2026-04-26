import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const ensureDemoAccounts = async (): Promise<void> => {
  const adminPasswordHash = await bcrypt.hash(env.demoAdminPassword, 10);
  const userPasswordHash = await bcrypt.hash(env.demoUserPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: env.demoAdminEmail },
    update: {
      username: 'platform_admin',
      role: 'admin',
      password_hash: adminPasswordHash,
      status: 'active'
    },
    create: {
      email: env.demoAdminEmail,
      username: 'platform_admin',
      role: 'admin',
      password_hash: adminPasswordHash,
      status: 'active'
    }
  });

  const user = await prisma.user.upsert({
    where: { email: env.demoUserEmail },
    update: {
      username: 'demo_user',
      role: 'user',
      password_hash: userPasswordHash,
      status: 'active'
    },
    create: {
      email: env.demoUserEmail,
      username: 'demo_user',
      role: 'user',
      password_hash: userPasswordHash,
      status: 'active'
    }
  });

  logger.info('Demo accounts ensured', {
    module: 'bootstrap',
    adminId: admin.id,
    userId: user.id
  });

  // #region agent log
  fetch('http://127.0.0.1:7763/ingest/f7634983-5a77-4a9d-a744-81ae45180aea',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1a4728'},body:JSON.stringify({sessionId:'1a4728',runId:'post-fix-demo-accounts',hypothesisId:'H1-H4',location:'src/services/demo-account.service.ts:51',message:'Demo accounts ensured at startup',data:{adminEmail:env.demoAdminEmail,userEmail:env.demoUserEmail,adminId:admin.id,userId:user.id},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
};
