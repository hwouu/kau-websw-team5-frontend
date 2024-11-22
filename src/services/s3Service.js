import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

// AWS S3 클라이언트 생성
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// S3 업로드 함수
export const uploadToS3 = async (file, folderName) => {
  const fileStream = fs.createReadStream(file.path);

  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME, // S3 버킷 이름
    Key: `${folderName}${Date.now()}-${file.originalname}`, // S3에 저장될 파일 이름
    Body: fileStream,
    ContentType: file.mimetype,
  };

  const command = new PutObjectCommand(uploadParams);

  try {
    const result = await s3Client.send(command);
    return { Location: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}` };
  } catch (error) {
    console.error('S3 업로드 오류:', error);
    throw error;
  }
};
