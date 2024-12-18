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

// 전체 사용자 목록 조회 컨트롤러
export const getAllUsers = async (req, res, next) => {
  try {
    // 현재 요청한 유저 정보 조회
    const currentUser = await prisma.user.findUnique({
      where: { userID: req.user.userId },
    });

    // isMaster 권한 체크
    if (!currentUser || !currentUser.isMaster) {
      return res.status(403).json({ message: '접근 권한이 없습니다. (isMaster 권한 필요)' });
    }

    // 전체 유저 목록 조회 (마스트 제외)
    const users = await prisma.user.findMany({
      where: {
        isMaster: false
      }
    });

    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
}

// 선택한 사용자 회원 삭제 컨트롤러
export const deleteUser = async (req, res, next) => {
  const { userId } = req.params; // 삭제할 사용자 ID

  try {
    // 현재 요청한 유저 정보 조회
    const currentUser = await prisma.user.findUnique({
      where: { userID: req.user.userId },
    });

    // 마스터 권한 체크
    if (!currentUser || !currentUser.isMaster) {
      return res.status(403).json({ message: '접근 권한이 없습니다. (isMaster 권한 필요)' });
    }

    // 삭제 대상 사용자 조회
    const targetUser = await prisma.user.findUnique({
      where: { userID: Number(userId) },
      include: { reports: true }
    });

    if (!targetUser) {
      return res.status(404).json({ message: '삭제할 사용자를 찾을 수 없습니다.' });
    }

    // 마스터 자기 자신을 삭제하려 하는 경우 방지
    if (targetUser.userID === currentUser.userID) {
      return res.status(400).json({ message: '자기 자신을 삭제할 수 없습니다.' });
    }

    // 대상 사용자가 가진 모든 보고서의 소유자 변경
    if (targetUser.reports && targetUser.reports.length > 0) {
      await prisma.report.updateMany({
        where: { user_id: targetUser.userID },
        data: { user_id: currentUser.userID },
      });
    }

    // 대상 사용자 삭제
    await prisma.user.delete({
      where: { userID: targetUser.userID },
    });

    return res.status(200).json({ message: '사용자가 성공적으로 삭제되었습니다. 해당 사용자의 보고서는 마스터 계정으로 이전되었습니다.' });
  } catch (err) {
    next(err);
  }
}

// 현재 로그인한 유저가 마스터 or 일반 유저인지 구분하는 컨트롤러
export const checkUser = async (req, res, next) => {
  try {
    // 현재 요청한 유저 정보 조회
    const currentUser = await prisma.user.findUnique({
      where: { userID: req.user.userId },
    });

    // isMaster 권한 체크
    if (currentUser.isMaster) { 
      return res.status(200).json({ 
        message: '현재 사용자는 Master (관리자) 사용자 입니다.', 
        userID: currentUser.userID, 
        username: currentUser.username, 
        email: currentUser.email,
        isMaster: currentUser.isMaster
      });
    } else {
      return res.status(200).json({ 
        message: '현재 사용자는 일반 사용자 입니다.', 
        userID: currentUser.userID, 
        username: currentUser.username, 
        email: currentUser.email,
        isMaster: currentUser.isMaster
      });
    } 
  } catch (err) {
    next(err);
  }
}