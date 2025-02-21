import nodemailer from 'nodemailer';
import crypto from 'crypto';
import prisma from '../config/prismaClient.js';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config({ override: true });

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_OAUTH_CLIENT_ID,
  process.env.GMAIL_OAUTH_CLIENT_SECRET,
  process.env.GMAIL_OAUTH_REDIRECT_URL
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
});

const getAccessToken = async () => {
  try {
    const { token } = await oauth2Client.getAccessToken();
    return token;
  } catch (error) {
    console.error('Error getting Access Token:', error);
    throw new Error('Access Token 생성 실패');
  }
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GMAIL_OAUTH_USER,
    clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
    clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
    accessToken: await getAccessToken(),
  },
});

export const sendVerificationEmail = async (user) => {
  try {
    // 사용자와 관리자용 토큰 생성
    const emailToken = crypto.randomBytes(32).toString('hex');
    const adminToken = crypto.randomBytes(32).toString('hex');

    await prisma.user.update({
      where: { userID: user.userID },
      data: { emailToken, adminToken },
    });

    // 사용자 인증 링크 생성
    const verificationUrl = `${process.env.BASE_URL}/api/users/verify-email?token=${emailToken}`;
    
    // 관리자 승인 링크
    const adminVerificationUrl = `${process.env.BASE_URL}/api/users/admin/verify-user?token=${adminToken}`;

    // 사용자에게 이메일 전송
    const userMailOptions = {
      from: process.env.GMAIL_OAUTH_USER,
      to: user.email,
      subject: '교통사고 분석 시스템: 사고탐정 - 이메일 인증을 완료해주세요',
      html: `<p>이메일 인증을 완료하려면 다음 링크를 클릭해주세요: <a href="${verificationUrl}">이메일 인증</a></p>`,
    };

    // 서버 관리자에게 이메일 전송
    const adminMailOptions = {
      from: process.env.GMAIL_OAUTH_USER,
      to: process.env.ADMIN_EMAIL,
      subject: '교통사고 분석 시스템: 사고탐정 - 새 사용자 가입 (이메일 인증 요청)',
      html: `<p>새 사용자가 가입했습니다. 이메일 인증을 위해 <a href="${adminVerificationUrl}">여기를 클릭</a>하세요.</p><p>사용자 이메일: ${user.email}</p>`,
    };

    // 이메일 전송
    await transporter.sendMail(userMailOptions);
    await transporter.sendMail(adminMailOptions);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};
