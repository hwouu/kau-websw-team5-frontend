import express from 'express';
import multer from 'multer';
import { validateFile } from '../middlewares/fileValidationMiddleware.js';
import { handleFileUpload } from '../controllers/uploadController.js';

const router = express.Router();

// Multer 설정: 업로드 경로와 파일 이름 지정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // 'uploads' 폴더에 저장
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// 파일 업로드 라우트
router.post('/upload', upload.array('files', 6), validateFile, handleFileUpload);

export default router;
