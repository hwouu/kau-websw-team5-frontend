import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';

const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('stream', (data) => {
    socket.broadcast.emit('stream', data); // 스트리밍 데이터 브로드캐스트
  });
});

server.listen(3000, () => console.log('Server started on port 3000'));