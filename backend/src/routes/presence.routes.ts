import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { getOnlineUsers, getTyping, postHeartbeat, postTyping } from '../controllers/presence.controller';

const router = Router();

router.use(requireAuth);
router.post('/heartbeat', postHeartbeat);
router.get('/online', getOnlineUsers);
router.post('/typing', postTyping);
router.get('/typing', getTyping);

export default router;

