import { Router } from 'express';
import {
  crackHashes,
  honeypotAdmin,
  leakChatPlaintext,
  leakConfigSecrets,
  leakCrawlerInfo,
  leakFileRead,
  leakIdorProfile,
  leakSsrf,
  leakUsers,
  uploadGuardedFile,
  uploadSingle,
  vulnerableUserApi
} from '../controllers/security-demo.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/user', vulnerableUserApi);
router.all('/admin-test', honeypotAdmin);
router.get('/leak/users', leakUsers);
router.get('/leak/crawler-info', leakCrawlerInfo);
router.get('/leak/chat-plaintext', leakChatPlaintext);
router.get('/leak/config-secrets', leakConfigSecrets);
router.get('/leak/idor-profile', leakIdorProfile);
router.get('/leak/ssrf', leakSsrf);
router.get('/leak/file-read', leakFileRead);
router.post('/leak/crack', crackHashes);
router.post('/videos/upload-file', requireAuth, uploadSingle, uploadGuardedFile);

export default router;
