import express from 'express';
import upload from '../middlewares/multerconfig.js';
import { startStream, startRecording, stopRecording, uploadRecording } from '../controllers/streamController.js';

const router = express.Router();

router.get('/start', startStream);
router.post('/start-recording', startRecording);
router.post('/stop-recording', stopRecording);
router.post('/upload', upload.single('video'), uploadRecording); // Upload route

export default router;







