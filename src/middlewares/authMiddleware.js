import jwt from 'jsonwebtoken';
import prisma from '../config/prismaClient.js';
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
    // 프로필 접근 시 사용자 정보를 포함하여 응답합니다.
    res.status(200).json({
      message: '프로필 접근 성공',
      user: req.user
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Access Token이 만료된 경우, Refresh Token을 사용하여 갱신
      try {
        const newAccessToken = await refreshAccessToken(req);
        // 새 액세스 토큰을 헤더에 설정하고 사용자 정보를 유지합니다.
        req.headers.authorization = `Bearer ${newAccessToken}`;
        
        // 새 액세스 토큰으로 디코딩하여 사용자 정보를 가져옵니다.
        const decoded = jwt.verify(newAccessToken, process.env.JWT_SECRET);
        req.user = decoded;

        // 프로필 접근 시 사용자 정보를 포함하여 응답합니다.
        res.status(200).json({
          message: '프로필 접근 성공',
          user: req.user
        });
      } catch (refreshErr) {
        return res.status(403).json({ message: '새로운 Access Token 발급 실패' });
      }
    } else {
      return res.status(401).json({ message: '유효하지 않은 Access Token입니다.' });
    }
  }
};
