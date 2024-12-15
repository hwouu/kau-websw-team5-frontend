import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getFAQsHandler, createFAQHandler, updateFAQHandler, deleteFAQHandler } from '../controllers/faqController.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(authMiddleware); 

router.get('/', getFAQsHandler);
router.post('/', createFAQHandler);
router.put('/:id', updateFAQHandler);
router.delete('/:id', deleteFAQHandler);

export default router;
