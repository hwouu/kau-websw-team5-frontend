import express from 'express';
import multer from 'multer';
import path from 'path';
import { startStream, startRecording, stopRecording, uploadRecording } from '../controllers/streamController.js';

const router = express.Router();

// multer diskStorage 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join('public', 'recordings')); // 저장 폴더
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}.mp4`); // 고유한 파일 이름으로 저장
  }
});

const upload = multer({ storage }); // 새 storage 설정 사용

router.get('/start', startStream);
router.post('/start-recording', startRecording);
router.post('/stop-recording', stopRecording);
router.post('/upload', upload.single('video'), uploadRecording); // Upload route

export default router;







