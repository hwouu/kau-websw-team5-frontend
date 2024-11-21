import prisma from '../prismaClient.js';
import { uploadToS3 } from '../services/s3Service.js';
import fs from 'fs';

export const handleFileUpload = async (req, res) => {
  try {
    const files = req.files;

    // MIME타입에 따라 경로를 반환하는 함수
    const folderName = (mimeType) => {
      if (mimeType.startsWith('image/')) {
        return 'images/'; // 이미지 폴더 설정
      } else if (mimeType.startsWith('video/')) {
        return 'videos/'; // 비디오 폴더 설정
      } else {
        throw new Error('지원하지 않는 파일 형식입니다.');
      }
    };

    // 업로드된 파일 처리
    const uploadPromises = files.map(async (file) => {
      const folder = folderName(file.mimetype); // MIME 타입에 따라 폴더 결정

      // S3에 파일 업로드
      const result = await uploadToS3(file, folder);

      // S3에 업로드 후 로컬 파일 삭제
      fs.unlinkSync(file.path);

      // 업로드 결과를 데이터베이스에 저장
      await prisma.upload.create({
        data: {
          fileName: file.originalname,
          filePath: result.Location, // S3 URL 저장
          fileType: file.mimetype,
        },
      });



      // 폴더 경로 검증
      if (!result.Location.includes(folder)) {
        throw new Error(
          `파일이 올바른 폴더에 업로드되지 않았습니다. 예상 폴더: ${folder}, 실제 경로: ${result.Location}`
        );
      }

      return result.Location;
    });

    const fileUrls = await Promise.all(uploadPromises);

    res.status(200).json({ message: '파일 업로드 성공!', files: fileUrls });
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    res.status(500).json({ message: '파일 업로드 실패', error: error.message });
  }
};
