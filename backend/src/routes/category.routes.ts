import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createCategory, deleteCategory, listCategories, listMyCategories } from '../controllers/category.controller';

const router = Router();

router.get('/', listCategories);
router.get('/mine', requireAuth, listMyCategories);
router.post('/', requireAuth, createCategory);
router.delete('/:id', requireAuth, deleteCategory);

export default router;
