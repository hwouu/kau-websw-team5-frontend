import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getWelcomeMessage, createReport, analyzeAccident, reportAccident, handleUserMessage, sendToLLMAndUpdateDescription } from '../controllers/chatbotController.js';

// 파일 업로드 설정
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(authMiddleware); 

// 초기 메시지 반환
router.get('/initial', getWelcomeMessage);  

// 기본 정보 입력 DB 저장   
router.post('/reports', createReport);

// 사용자 입력 분석 요청
router.post('/analyze', analyzeAccident);

// 추가 11/29
router.post("/chat", handleUserMessage);

// LLM 서버 데이터 전송 및 응답
router.post("/update-description", sendToLLMAndUpdateDescription);

router.post('/report',upload.array('files'), reportAccident);

export default router; // ES Module 방식으로 export