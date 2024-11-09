import jwt from 'jsonwebtoken';
import prisma from '../models/user.js';
import { refreshAccessToken } from '../controllers/authController.js';

export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Token이 필요합니다.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { userID: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Access Token이 만료된 경우, Refresh Token을 사용하여 갱신
      try {
        const newAccessToken = await refreshAccessToken(req);
        if (newAccessToken) {
          // 새 Access Token을 헤더에 설정하고 요청을 다시 진행
          req.headers.authorization = `Bearer ${newAccessToken}`;
          next();
        }
      } catch (refreshErr) {
        return res.status(403).json({ message: '새로운 Access Token 발급 실패' });
      }
    } else {
      return res.status(401).json({ message: '유효하지 않은 Access Token입니다.' });
    }
  }
};
