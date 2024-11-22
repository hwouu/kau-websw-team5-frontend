import prisma from '../config/prismaClient.js';
import { uploadToS3 } from '../services/s3Service.js';
import fs from 'fs';
import path from 'path';


// 녹화 파일을 AWS S3에 업로드하고 데이터베이스에 경로를 저장하는 함수
export const uploadRecording = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded', error: 'File is required' });
    }

    const folderName = 'recordings/';
    const result = await uploadToS3(req.file, folderName);

    // DB 저장
    await prisma.recording.create({
      data: {
        filePath: result.Location,
        createdAt: new Date(),
        userID: req.user.userId,
      },
    });

    // 모든 임시 파일 삭제
    const tempDir = path.join('public', 'recordings');
    const files = fs.readdirSync(tempDir); // 디렉토리 내 파일 목록 가져오기

    files.forEach((file) => {
      const filePath = path.join(tempDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted temporary file: ${filePath}`);
      } catch (err) {
        console.error(`Failed to delete file: ${filePath}`, err);
      }
    });

    res.status(200).json({ message: 'File uploaded successfully', path: result.Location });
  } catch (error) {
    console.error('Upload process error:', error);
    res.status(500).json({ message: 'Upload error', error: error.message });
  }
};