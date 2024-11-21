import AWS from 'aws-sdk';
import fs from 'fs';

// AWS 설정
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// S3 업로드 함수
export const uploadToS3 = (file, folderName) => {
  const fileStream = fs.createReadStream(file.path);

  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME, // S3 버킷 이름
    Key: `${folderName}${Date.now()}-${file.originalname}`, // S3에 저장될 파일 이름
    Body: fileStream,
    ContentType: file.mimetype,
  };

  return s3.upload(uploadParams).promise(); // 업로드 완료 시 Promise 반환
};
