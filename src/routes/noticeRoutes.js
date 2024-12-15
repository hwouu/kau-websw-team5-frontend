import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getNoticesHandler, getNoticeByIdHandler, createNoticeHandler, updateNoticeHandler, deleteNoticeHandler } from '../controllers/noticeController.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(authMiddleware); 

router.get('/', getNoticesHandler);
router.get('/:id', getNoticeByIdHandler);
router.post('/', createNoticeHandler);
router.put('/:id', updateNoticeHandler);
router.delete('/:id', deleteNoticeHandler);

export default router;
