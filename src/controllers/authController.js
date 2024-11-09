import jwt from 'jsonwebtoken';
import { generateAccessToken } from './userController.js';
import prisma from '../models/user.js'

export const refreshAccessToken = async (req) => {
  const refreshToken = req.cookies.refreshToken;
  console.log(refreshToken);
  if (!refreshToken) {
    throw new Error('Refresh Token이 필요합니다.');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({
      where: { userID: decoded.userId },
    });

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    // 새로운 Access Token 발급
    const newAccessToken = generateAccessToken(user);
    return newAccessToken;
  } catch (err) {
    throw new Error('유효하지 않은 Refresh Token입니다.');
  }
};