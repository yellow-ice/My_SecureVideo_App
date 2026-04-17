import { Router } from 'express';
import { deleteVideo, getComments, getVideoById, getVideos, postComment, uploadFile, uploadVideo } from '../controllers/video.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { uploadSingle } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', getVideos);
router.post('/upload', requireAuth, uploadSingle.single('file'), uploadFile);
router.get('/:id', getVideoById);
router.get('/:id/comments', getComments);
router.post('/:id/comments', requireAuth, postComment);
router.post('/', requireAuth, uploadVideo);
router.delete('/:id', requireAuth, deleteVideo);

export default router;
