import express from 'express';
import { registerUser, loginUser, logoutUser } from '../controllers/userController.js';
import { registerMiddleware } from '../middlewares/userMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { verifyUserEmailToken, verifyAdminEmailToken } from '../middlewares/emailVerificationMiddleware.js';

const router = express.Router();

// 회원가입 라우트
router.post('/register', registerMiddleware, registerUser);

// 사용자 이메일 인증 라우트
router.get('/verify-email', verifyUserEmailToken);

// 관리자 이메일 인증 라우트
router.get('/admin/verify-user', verifyAdminEmailToken);

// 로그인 라우트
router.post('/login', loginUser); // 사용자 로그인 라우트

// 로그아웃 라우트
router.post('/logout', logoutUser);

// 사용자 프로필 접근 라우트 예시 
router.get('/profile', authMiddleware);

export default router;

