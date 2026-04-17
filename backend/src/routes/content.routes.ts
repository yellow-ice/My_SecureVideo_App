import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  addFavorite,
  createContent,
  createFavoriteFolder,
  deleteContent,
  getContentById,
  likeContent,
  listContentComments,
  listContents,
  listMyContents,
  listFavoriteFolders,
  listFavoriteItems,
  moveFavoriteItem,
  postContentComment,
  removeFavorite,
  removeFavoriteItem,
  unlikeContent,
  resubmitContent,
  updateContent
} from '../controllers/content.controller';

const router = Router();

router.get('/favorites/folders', requireAuth, listFavoriteFolders);
router.post('/favorites/folders', requireAuth, createFavoriteFolder);
router.get('/favorites/items', requireAuth, listFavoriteItems);
router.delete('/favorites/items/:id', requireAuth, removeFavoriteItem);
router.patch('/favorites/items/:id', requireAuth, moveFavoriteItem);

router.get('/', requireAuth, listContents);
router.get('/mine', requireAuth, listMyContents);
router.get('/:id', requireAuth, getContentById);
router.post('/', requireAuth, createContent);
router.patch('/:id', requireAuth, updateContent);
router.delete('/:id', requireAuth, deleteContent);
router.post('/:id/resubmit', requireAuth, resubmitContent);

router.get('/:id/comments', listContentComments);
router.post('/:id/comments', requireAuth, postContentComment);

router.post('/:id/likes', requireAuth, likeContent);
router.delete('/:id/likes', requireAuth, unlikeContent);

router.post('/:id/favorites', requireAuth, addFavorite);
router.delete('/:id/favorites', requireAuth, removeFavorite);

export default router;
