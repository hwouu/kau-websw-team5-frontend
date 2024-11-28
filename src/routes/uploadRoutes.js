import express from 'express';
import upload from '../middlewares/multerconfig.js';
import { validateFile } from '../middlewares/fileValidationMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { handleFileUpload } from '../controllers/uploadController.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(authMiddleware);

// 파일 업로드 라우트 (최대 6개 파일 업로드)
router.put('/upload', upload.array('files'), validateFile, handleFileUpload);

export default router;
