import express from 'express';
import upload from '../middlewares/multerconfig.js';
import { uploadRecording } from '../controllers/streamController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(authMiddleware); 

// 웹캠 녹화영상 업로드 라우트 
router.post('/upload', upload.single('video'), uploadRecording); 

export default router;







