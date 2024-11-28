import prisma from '../config/prismaClient.js';
import { uploadToS3 } from '../services/s3Service.js';
import fs from 'fs';
import path from 'path';

export const handleFileUpload = async (req, res) => {
  try {
    const files = req.files;
    const { userId, reportId } = req.body; // userID와 reportID를 요청에서 추출

    if (!userId || !reportId) {
      return res.status(400).json({ message: 'userID와 reportID가 필요합니다.' });
    }

    // MIME타입에 따라 경로를 반환하는 함수
    const folderName = (mimeType) => {
      if (mimeType.startsWith('image/')) return 'images/';
      if (mimeType.startsWith('video/')) return 'videos/';
      throw new Error('지원하지 않는 파일 형식입니다.');
    };

    const fileUrls = await Promise.all(
      files.map(async (file) => {
        const folder = folderName(file.mimetype);
        const result = await uploadToS3(file, folder);

        fs.unlinkSync(file.path);

        return result.Location; // S3 URL 반환
      })
    );

    // 파일 타입 설정
    const fileType = files[0]?.mimetype.split('/')[0];

    // 데이터베이스 업데이트
    const updatedReport = await prisma.reports.update({
      where: { report_id: reportId },
      data: {
        fileUrl: fileUrls, // URL 배열을 JSON 형태로 저장
        fileType, // 파일 타입 저장
      },
    });

    // 모든 임시 파일 삭제
    const tempDirs = ['public/image', 'public/video'];
    tempDirs.forEach((dir) => {
      if (fs.existsSync(dir)) {
        const filesInDir = fs.readdirSync(dir); // 디렉토리 내 파일 목록 읽기
        filesInDir.forEach((file) => {
          const filePath = path.join(dir, file);
          try {
            fs.unlinkSync(filePath); // 파일 삭제
            console.log(`Deleted temporary file: ${filePath}`);
          } catch (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
          }
        });
      }
    });
    

    res.status(200).json({ message: '파일 업로드 성공!', report: updatedReport  });
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    res.status(500).json({ message: '파일 업로드 실패', error: error.message });
  }
};
