import { Router } from 'express';
import {
  banIp,
  listUsers,
  impactRevealToken,
  impactReport,
  updateUser,
  deleteUser,
  securityAttacks,
  securityLogs,
  securityOverview,
  securitySettings,
  simulateAttack,
  toggleDefense,
  toggleSecuritySwitches,
} from '../controllers/admin.controller';
import { adminListContents, adminReviewContent } from '../controllers/admin-content.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth, requireAdmin);
router.get('/security/overview', securityOverview);
router.get('/security/attacks', securityAttacks);
router.get('/security/impact', impactReport);
router.post('/security/impact/reveal-token', impactRevealToken);
router.get('/security/logs', securityLogs);
router.get('/security/settings', securitySettings);
router.post('/security/toggle-defense', toggleDefense);
router.post('/security/switches', toggleSecuritySwitches);
router.post('/security/simulate-attack', simulateAttack);
router.post('/security/ban/:ip', banIp);

router.get('/users', listUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/contents', adminListContents);
router.post('/contents/:id/review', adminReviewContent);

export default router;
