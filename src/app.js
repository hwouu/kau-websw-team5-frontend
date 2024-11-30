import express from 'express';
import streamRoutes from './routes/streamRoutes.js';
import userRoutes from './routes/userRoutes.js';
import errorHandler from './middlewares/errorHandler.js';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import uploadRoutes from './routes/uploadRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { redirectIfAuthenticated } from './middlewares/authMiddleware.js';

const corsOptions = {
  origin: ['https://traffic-incident-analysis.vercel.app', 'http://localhost:3000', 'https://www.kautas.shop'], // 도메인 허용
  credentials: true, // 쿠키를 포함한 요청을 허용 
};

const app = express();

// ES 모듈에서 __dirname을 사용할 수 있도록 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public'))); // 정적파일 제공

app.get('/api', redirectIfAuthenticated, (req, res) => {
  res.status(200).json({ message: '로그인 상태, 대시보드 접급 성공', user: req.user });
});

app.use('/api/users', userRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/files', uploadRoutes);
app.use('/api/report', reportRoutes);

app.use(errorHandler); // 전역 에러 핸들링 미들웨어 등록

export default app;