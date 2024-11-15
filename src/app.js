import express from 'express';
import streamRoutes from './routes/streamRoutes.js';
import userRoutes from './routes/userRoutes.js';
import errorHandler from './middlewares/errorHandler.js';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();

// ES 모듈에서 __dirname을 사용할 수 있도록 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public'))); // 정적파일 제공

app.use('/api/users', userRoutes);
app.use('/api/stream', streamRoutes);

app.use(errorHandler); // 전역 에러 핸들링 미들웨어 등록

export default app;