import bcrypt from 'bcrypt';
import prisma from '../config/prismaClient.js';
import { generateAccessToken, generateRefreshToken } from './authController.js';
import { sendVerificationEmail } from '../services/emailService.js';

// 회원가입 컨트롤러
export const registerUser = async (req, res, next) => {
  const { username, password, email } = req.body;

  try {
    // 중복 username 및 email 검사
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }], },
    });

    if (existingUser) {
      const field = existingUser.username === username ? '사용자 이름' : '이메일';
      return res.status(400).json({ message: `이미 사용 중인 ${field}입니다.` });
    }

    // 비밀번호 bcrypt 해싱
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 새로운 사용자 생성
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
      },
    });

    await sendVerificationEmail(newUser);
    res.status(201).json({ message: '회원가입 성공! 이메일 인증을 완료해주세요.', userId: newUser.userID });
  } catch (err) {
    next(err); // 에러는 다음 미들웨어로 전달
  }
};

// 유저 로그인 컨트롤러
export const loginUser = async (req, res, next) => {
  const { username, password } = req.body;

  // 필수 입력 항목 확인
  if (!username || !password) {
    return res.status(400).json({ message: '사용자 이름과 비밀번호를 모두 입력해주세요.' });
  }

  try {
    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { username },
    });

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: '비밀번호가 올바르지 않습니다.' });
    }

    if (!user.emailVerified && !user.adminVerified) {
      return res.status(403).json({ message: '이메일 인증과 관리자 인증이 완료되지 않았습니다.' });
    }

    if (!user.emailVerified) { return res.status(403).json({ message: '이메일 인증이 완료되지 않았습니다.' }); }
    if (!user.adminVerified) { return res.status(403).json({ message: '관리자 인증이 완료되지 않았습니다.' }); }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Refresh Token을 HttpOnly 쿠키에 저장
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, sameSite: 'strict' });

    // 로그인 성공 응답
    res.status(200).json({ message: '로그인 성공!', accessToken, userID: user.userID, username: user.username, email: user.email  });
  } catch (err) {
    next(err); // 에러는 다음 미들웨어로 전달
  }
};

// 로그아웃 컨트롤러
export const logoutUser = (req, res) => {
  
  // 쿠키에서 refreshToken을 삭제하여 로그아웃 처리
  res.clearCookie('refreshToken', { httpOnly: true, secure: false, sameSite: 'strict' });
  
  // 로그아웃 성공 응답
  res.status(200).json({ message: '로그아웃 성공!' });
};