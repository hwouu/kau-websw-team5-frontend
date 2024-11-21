import prisma from '../config/prismaClient.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs'; 
import dotenv from 'dotenv';

dotenv.config();

// S3 클라이언트 설정
const s3 = new S3Client({ region: process.env.AWS_REGION }); // AWS 지역 설정 
const bucketName = process.env.AWS_S3_BUCKET_NAME; // S3 버킷 이름

// 녹화 파일을 AWS S3에 업로드하고 데이터베이스에 경로를 저장하는 함수
export const uploadRecording = async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const fileContent = fs.readFileSync(file.path); // 로컬 파일 읽기
    const s3Key = `recordings/${file.filename}`; // S3 저장 경로 설정

    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'video/mp4',
    };

    const result = await s3.send(new PutObjectCommand(uploadParams)); // S3에 업로드
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    // 사용자 ID를 Recording에 저장
    const userID = req.user.userId; // `authMiddleware`에서 설정된 사용자 정보
    await prisma.recording.create({
      data: {
        filePath: fileUrl,
        createdAt: new Date(),
        userID, // 업로드한 사용자 ID 저장
      },
    });

    fs.unlinkSync(file.path); // 로컬 파일 삭제
    res.status(200).json({ message: 'File uploaded successfully', path: fileUrl });
  } catch (error) {
    console.error('S3 Upload Error:', error);
    res.status(500).json({ message: 'Upload error', error });
  }
};