import dotenv from 'dotenv';
import { Server } from 'socket.io';
import app from './app.js';
import http from 'http';

dotenv.config({ override: true }); // .env 파일 로드

// HTTP 및 Socket.io 서버 생성
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // 모든 도메인 허용 (필요에 따라 제한 가능)
    methods: ['GET', 'POST'],
  },
});

// 클라이언트 연결 처리
io.on('connection', (socket) => {
  console.log('New client connected');

  // 클라이언트에서 스트림 데이터 수신
  socket.on('stream', (data) => {
    socket.broadcast.emit('stream', data); // 스트리밍 데이터 브로드캐스트
  });

  // 클라이언트 연결 해제
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// 서버 시작
server.listen(3000, () => console.log('Server started on port 3000'));