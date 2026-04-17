const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin@123456', 10);
  const userPassword = await bcrypt.hash('User@123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@securevideo.com' },
    update: { username: 'platform_admin', role: 'admin', password_hash: adminPassword, status: 'active' },
    create: {
      email: 'admin@securevideo.com',
      username: 'platform_admin',
      role: 'admin',
      password_hash: adminPassword,
      status: 'active'
    }
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@securevideo.com' },
    update: { username: 'demo_user', role: 'user', password_hash: userPassword, status: 'active' },
    create: {
      email: 'user@securevideo.com',
      username: 'demo_user',
      role: 'user',
      password_hash: userPassword,
      status: 'active'
    }
  });

  const demoVideos = [
    {
      title: '网络安全态势感知入门',
      description: '从零了解SOC与威胁检测体系。',
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      cover_url: 'https://picsum.photos/seed/security1/640/360',
      category: 'security',
      duration: 420,
      status: 'published'
    },
    {
      title: 'Vue3 + TypeScript 实战',
      description: '组件化开发与工程化实践。',
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
      cover_url: 'https://picsum.photos/seed/vue3/640/360',
      category: 'tech',
      duration: 860,
      status: 'published'
    },
    {
      title: '日志分析与告警联动',
      description: '从日志采集到自动封禁策略。',
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      cover_url: 'https://picsum.photos/seed/security2/640/360',
      category: 'security',
      duration: 730,
      status: 'published'
    }
  ];

  for (const item of demoVideos) {
    const exists = await prisma.video.findFirst({ where: { title: item.title } });
    if (!exists) {
      await prisma.video.create({
        data: {
          ...item,
          user_id: item.category === 'security' ? admin.id : user.id,
          views: Math.floor(Math.random() * 2000) + 100,
          likes: Math.floor(Math.random() * 500) + 30
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed completed.');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
