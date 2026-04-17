import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  resolveNotificationTarget
} from '../controllers/notification.controller';

const router = Router();

router.use(requireAuth);
router.get('/', listNotifications);
router.get('/:id/target', resolveNotificationTarget);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

export default router;
