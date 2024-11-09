import express from 'express';
import { loginUser, registerUser } from '../controllers/userController.js';
import { refreshAccessToken } from '../controllers/authController.js';
import { registerMiddleware } from '../middlewares/userMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 회원가입 라우트
router.post('/register', registerMiddleware, registerUser);

// 로그인 라우트
router.post('/login', loginUser); // 사용자 로그인 라우트

// 사용자 프로필 접근 라우트 예시 
router.get('/profile', authMiddleware, (req, res) => {
  res.json({ message: '프로필 접근 성공', user: req.user });
});

export default router;

