import prisma from '../prismaClient.js';

// 사용자 이메일 인증 미들웨어
export const verifyUserEmailToken = async (req, res, next) => {
  const { token } = req.query;

  try {
    const user = await prisma.user.findFirst({
      where: { emailToken: token },
    });

    if (!user) {
      return res.status(400).json({ message: '잘못된 사용자 인증 링크입니다.' });
    }

    // 이메일 인증 상태 업데이트
    await prisma.user.update({
      where: { userID: user.userID },
      data: { emailVerified: true, emailToken: null },
    });

    // 인증 후 BASE_URL로 리디렉션
    res.redirect(process.env.BASE_URL);
    //res.status(200).json({ message: '이메일 인증이 완료되었습니다.' });
  } catch (error) {
    console.error('Error verifying user email:', error);
    res.status(500).json({ message: '서버 오류로 인해 인증에 실패했습니다.' });
  }
};

// 관리자 이메일 인증 미들웨어
export const verifyAdminEmailToken = async (req, res, next) => {
  const { token } = req.query;

  try {
    const user = await prisma.user.findFirst({
      where: { adminToken: token },
    });

    if (!user) {
      return res.status(400).json({ message: '잘못된 관리자 인증 링크입니다.' });
    }

    // 관리자 인증 상태 업데이트
    await prisma.user.update({
      where: { userID: user.userID },
      data: { adminVerified: true, adminToken: null },
    });

    // 인증 후 BASE_URL로 리디렉션
    res.redirect(process.env.BASE_URL);
    //res.status(200).json({ message: '사용자가 관리자에 의해 인증되었습니다.' });
  } catch (error) {
    console.error('Error verifying admin email:', error);
    res.status(500).json({ message: '서버 오류로 인해 인증에 실패했습니다.' });
  }
};