import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const uploadToS3 = async (file, folderName) => {
  const fileStream = fs.createReadStream(file.path);

  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `${folderName}${Date.now()}-${file.originalname}`,
    Body: fileStream,
    ContentType: file.mimetype,
  };

  try {
    const upload = new Upload({
      client: s3Client,
      params: uploadParams,
    });

    const result = await upload.done();
    return {
      Location: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`,
    };
  } catch (error) {
    console.error('S3 업로드 오류:', error);
    throw error;
  }
};

// S3 업로드 함수
export const uploadToS3ImageVideo = async (file, folderName) => {
  const fileStream = fs.createReadStream(file.path);

  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME, // S3 버킷 이름
    Key: `${folderName}${Date.now()}-${file.originalname}`, // S3에 저장될 파일 이름
    Body: fileStream,
    ContentType: file.mimetype,
  };

  try {
    const result = await s3Client.send(new PutObjectCommand(uploadParams));
    return {
      Location: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`,
    };
  } catch (error) {
    console.error('S3 업로드 오류:', error);
    throw error;
  }
};