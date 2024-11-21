import prisma from '../config/prismaClient.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs'; 
import dotenv from 'dotenv';

dotenv.config({ override: true });

// S3 클라이언트 설정
const s3 = new S3Client({ region: process.env.AWS_REGION }); // AWS 지역 설정 
const bucketName = process.env.AWS_S3_BUCKET_NAME; // S3 버킷 이름

// 녹화 파일을 AWS S3에 업로드하고 데이터베이스에 경로를 저장하는 함수
export const uploadRecording = async (req, res) => {
  try {
    // 1. 파일 존재 여부 확인
    if (!req.file) {
      console.error('No file received');
      return res.status(400).json({ 
        message: 'No file uploaded',
        error: 'File is required' 
      });
    }

    console.log('Upload request received:', {
      file: req.file,
      userId: req.user?.userId
    });

    // 2. 디렉토리 확인
    const uploadDir = path.join('public', 'recordings');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('Created upload directory:', uploadDir);
    }

    // 3. 파일 읽기
    try {
      const fileContent = fs.readFileSync(req.file.path);
      console.log('File read successfully, size:', fileContent.length);
    } catch (readError) {
      console.error('File read error:', readError);
      return res.status(500).json({
        message: 'Failed to read uploaded file',
        error: readError.message
      });
    }

    // 4. S3 업로드
    const s3Key = `recordings/${req.file.filename}`;
    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'video/mp4',
    };

    try {
      const result = await s3.send(new PutObjectCommand(uploadParams));
      console.log('S3 upload successful:', result);
    } catch (s3Error) {
      console.error('S3 upload error:', s3Error);
      return res.status(500).json({
        message: 'S3 upload failed',
        error: s3Error.message
      });
    }

    // 5. 파일 URL 생성
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    // 6. DB 저장
    try {
      await prisma.recording.create({
        data: {
          filePath: fileUrl,
          createdAt: new Date(),
          userID: req.user.userId,
        },
      });
      console.log('Database record created');
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        message: 'Database operation failed',
        error: dbError.message
      });
    }

    // 7. 임시 파일 삭제
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('Temporary file deleted');
      }
    } catch (unlinkError) {
      console.error('Failed to delete temporary file:', unlinkError);
      // 임시 파일 삭제 실패는 critical error가 아니므로 계속 진행
    }

    // 8. 성공 응답
    return res.status(200).json({
      message: 'File uploaded successfully',
      path: fileUrl
    });

  } catch (error) {
    console.error('Upload process error:', error);
    return res.status(500).json({
      message: 'Upload error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};