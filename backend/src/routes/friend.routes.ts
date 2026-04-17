import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  clearChatMessages,
  listChatMessages,
  listFriendRequests,
  listFriends,
  removeFriend,
  respondFriendRequest,
  searchUsers,
  sendChatMessage,
  sendFriendRequest
} from '../controllers/friend.controller';

const router = Router();

router.use(requireAuth);
router.get('/search-users', searchUsers);
router.get('/requests', listFriendRequests);
router.post('/requests', sendFriendRequest);
router.post('/requests/:id/respond', respondFriendRequest);
router.get('/', listFriends);
router.get('/:friendId/messages', listChatMessages);
router.post('/:friendId/messages', sendChatMessage);
router.delete('/:friendId/messages', clearChatMessages);
router.delete('/:friendId', removeFriend);

export default router;
