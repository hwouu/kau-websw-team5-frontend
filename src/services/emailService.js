import nodemailer from 'nodemailer';
import crypto from 'crypto';
import prisma from '../config/prismaClient.js';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const { GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, GMAIL_OAUTH_REFRESH_TOKEN, GMAIL_OAUTH_USER } = process.env;

// Google OAuth2 클라이언트 설정
const oauth2Client = new google.auth.OAuth2(
  GMAIL_OAUTH_CLIENT_ID,
  GMAIL_OAUTH_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground' // 리디렉션 URI
);

// refreshToken 설정
oauth2Client.setCredentials({
  refresh_token: GMAIL_OAUTH_REFRESH_TOKEN,
});

// Nodemailer 전송자 생성
const createTransporter = async () => {
  try {
    const { token: accessToken } = await oauth2Client.getAccessToken();

    if (!accessToken) {
      throw new Error('Failed to retrieve access token. Refresh token might be invalid or expired.');
    }

    console.log('Access token retrieved successfully:', accessToken);

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: GMAIL_OAUTH_USER,
        clientId: GMAIL_OAUTH_CLIENT_ID,
        clientSecret: GMAIL_OAUTH_CLIENT_SECRET,
        refreshToken: GMAIL_OAUTH_REFRESH_TOKEN,
        accessToken, // 새로 갱신된 accessToken 사용
      },
    });
  } catch (error) {
    console.error('Error while creating transporter:', error.message);
    if (error.response?.data?.error === 'invalid_grant') {
      console.error('The refresh token is expired or revoked. Please regenerate a new refresh token.');
    }
    throw new Error('Failed to create transporter due to token issues');
  }
};


const checkToken = async () => {
  try {
    const { token: accessToken } = await oauth2Client.getAccessToken();
    console.log('Access Token retrieved successfully:', accessToken);
  } catch (error) {
    if (error.response?.data?.error === 'invalid_grant') {
      console.error('The refresh token is expired or revoked. Please regenerate a new refresh token.');
    } else {
      console.error('Error while checking refresh token:', error.message);
    }
  }
};

checkToken();

export const sendVerificationEmail = async (user) => {
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

  try {
    const transporter = await createTransporter(); // transporter 생성
    await transporter.sendMail(userMailOptions); // 사용자 이메일 전송
    await transporter.sendMail(adminMailOptions); // 관리자 이메일 전송
    console.log('Emails sent successfully');
  } catch (error) {
    console.error('Failed to send verification emails:', error);
  }
};
