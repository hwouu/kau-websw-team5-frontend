import express from 'express';
import { registerUser, loginUser, logoutUser, getAllUsers, deleteUser, checkUser } from '../controllers/userController.js';
import { registerMiddleware } from '../middlewares/userMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { verifyUserEmailToken, verifyAdminEmailToken } from '../middlewares/emailVerificationMiddleware.js';

const router = express.Router();

// 대시보드 라우트
router.get('/dashboard', authMiddleware, (req, res) => {
  res.status(200).json({ message: '대시보드 접근 성공', user: req.user });
})

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

// 전체 유저 목록 조회 라우트 (마스터 유저 권한)
router.get('/all-users', authMiddleware, getAllUsers);

// 특정 사용자 삭제 (마스터 유저 권한)
router.delete('/delete-user/:userId', authMiddleware, deleteUser);

// 사용자 유형 확인
router.get('/type', authMiddleware, checkUser);

// 사용자 프로필 접근 라우트 예시 
router.get('/profile', authMiddleware);

export default router;

