import express from 'express';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';
import errorHandler from './middlewares/errorHandler.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';

dotenv.config(); // .env 파일 로드


const corsOptions = {
  origin: 'http://localhost:3000', // 모든 도메인 허용
  credentials: true, // 쿠키를 포함한 요청을 허용 
};

const app = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/api/users', userRoutes);

app.use(errorHandler); // 전역 에러 핸들링 미들웨어 등록

app.listen(3000, () => console.log('Server Started'));