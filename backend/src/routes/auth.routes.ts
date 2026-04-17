import { Router } from 'express';
import { adminUnlockLogin, deactivateSelf, demoAccounts, login, profile, profileById, register, updateProfile, uploadAvatar } from '../controllers/auth.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth.middleware';
import { uploadSingle } from '../middlewares/upload.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/demo-accounts', demoAccounts);
router.post('/admin/unlock-login', requireAuth, requireAdmin, adminUnlockLogin);
router.get('/profile', requireAuth, profile);
router.get('/users/:id', requireAuth, profileById);
router.put('/update', requireAuth, uploadSingle.single('avatar'), updateProfile);
router.post('/avatar-upload', requireAuth, uploadSingle.single('avatar'), uploadAvatar);
router.post('/deactivate', requireAuth, deactivateSelf);

export default router;
