import express from 'express';
import { getAllReports, getSortedReports, getReport } from '../controllers/reportController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(authMiddleware);

router.get('/', getAllReports); // 전체 보고서 조회
router.get('/sorted', getSortedReports); // 정렬된 보고서 조회
router.get('/:reportId', getReport); // 특정 보고서 조회


export default router;