import prisma from '../config/prismaClient.js';
import { uploadToS3 } from '../services/s3Service.js';
import { captureFrames } from '../services/captureFrames.js';
import fs from 'fs';
import path from 'path';

export const handleFileUpload = async (req, res) => {
  try {
    const files = req.files;
    const { userId, reportId } = req.body; // userID와 reportID를 요청에서 추출

    if (!userId || !reportId) {
      return res.status(400).json({ message: 'userID와 reportID가 필요합니다.' });
    }

    // 토큰에서 추출한 사용자 ID와 요청에서 전달된 userId 비교
    if (req.user.userId !== parseInt(userId, 10)) {
      return res.status(403).json({ message: '권한이 없습니다. 요청한 userId가 토큰과 일치하지 않습니다.' });
    }

    // DB에서 reportId 존재 여부 확인
    const reportExists = await prisma.report.findUnique({
      where: { report_id: reportId },
    });

    if (!reportExists) {
      return res.status(404).json({ message: '해당 reportId가 존재하지 않습니다.' });
    }

    const fileUrls = [];
    const frameCount = 6;

    for (const file of files) {
      const folder = file.mimetype.startsWith('image/') ? 'images/' : 'videos/';
      const isVideo = file.mimetype.startsWith('video/');
      const filePath = file.path;

      if (isVideo) {
        const videoDir = path.join('public', 'videos'); // 로컬 영상 폴더
        const outputDir = path.join('public', 'videos', 'frames'); // 프레임 저장 폴더

        // 캡처 이미지 생성
        const capturedImages = await captureFrames(filePath, outputDir, frameCount);

        // 캡처된 이미지들을 S3에 업로드
        const imageFolder = `${folder}frames/`;
        const uploadedImages = await Promise.allSettled(
          capturedImages.map(async (imagePath) => {
            if (!fs.existsSync(imagePath)) {
              console.error(`File not found: ${imagePath}`);
              return null;
            }
            try {
              const fileName = path.basename(imagePath);
              const imageResult = await uploadToS3(
                { path: imagePath, mimetype: 'image/jpeg' },
                `${imageFolder}${Date.now()}-${fileName}`
              );
              fs.unlinkSync(imagePath); // 파일 삭제
              return imageResult.Location;
            } catch (error) {
              console.error(`Failed to upload image: ${imagePath}`, error);
              return null;
            }
          })
        );

        // 성공한 업로드만 필터링
        const successfulUploads = uploadedImages
          .filter((result) => result.status === 'fulfilled' && result.value)
          .map((result) => result.value);

        fileUrls.push(...successfulUploads);

        // 로컬 임시 파일 정리
        if (fs.existsSync(outputDir)) {
          fs.rmSync(outputDir, { recursive: true, force: true });
        }
      } else {
        const result = await uploadToS3(file, folder);
        fileUrls.push(result.Location);
      }

      fs.unlinkSync(filePath); // 업로드 후 로컬 파일 삭제
    }

    // DB 업데이트
    const updatedReport = await prisma.report.update({
      where: { report_id: reportId },
      data: {
        fileUrl: fileUrls, // URL 배열을 JSON 형태로 저장
        fileType: 'image', // 파일 타입을 항상 'image'로 설정
      },
    });
    

    res.status(200).json({ message: '파일 업로드 성공!', report: updatedReport  });
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    res.status(500).json({ message: '파일 업로드 실패', error: error.message });
  }
};
