import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import authRoutes from './routes/auth.routes';
import videoRoutes from './routes/video.routes';
import adminRoutes from './routes/admin.routes';
import securityDemoRoutes from './routes/security-demo.routes';
import categoryRoutes from './routes/category.routes';
import contentRoutes from './routes/content.routes';
import notificationRoutes from './routes/notification.routes';
import friendRoutes from './routes/friend.routes';
import presenceRoutes from './routes/presence.routes';
import { apiLimiter } from './middlewares/security.middleware';
import { wafMiddleware } from './middlewares/waf.middleware';
import { crawlerGuard } from './middlewares/crawler.middleware';
import { logger } from './config/logger';

const app = express();

app.use(
  helmet({
    // Frontend runs on a different origin (5173), avatar/cover images are served from 3000.
    // Allow cross-origin resource loading for static assets like avatars.
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(apiLimiter);
app.use(wafMiddleware);
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim(), { module: 'http' })
    }
  })
);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/uploads/covers/:filename', (req, res, next) => {
  const { filename } = req.params;
  const coversFile = path.resolve(process.cwd(), 'uploads', 'covers', filename);
  if (fs.existsSync(coversFile)) {
    res.sendFile(coversFile);
    return;
  }
  // Backward compatibility: old avatar uploads were accidentally saved to videos dir.
  const legacyVideoFile = path.resolve(process.cwd(), 'uploads', 'videos', filename);
  if (fs.existsSync(legacyVideoFile)) {
    res.sendFile(legacyVideoFile);
    return;
  }
  next();
});
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/videos', crawlerGuard);
app.use('/api/videos', videoRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/contents', contentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', securityDemoRoutes);

export default app;
