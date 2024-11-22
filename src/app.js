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

const corsOptions = {
  origin: ['https://traffic-incident-analysis.vercel.app', 'http://localhost:3000'], // 도메인 허용
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

app.use('/api/users', userRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.use(errorHandler); // 전역 에러 핸들링 미들웨어 등록

app.use('/api/files', uploadRoutes);//업로드 파일 추가

export default app;