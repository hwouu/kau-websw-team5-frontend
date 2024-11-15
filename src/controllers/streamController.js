import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import prisma from '../config/prismaClient.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs'; // 파일 작업을 위한 fs 모듈
import dotenv from 'dotenv';

dotenv.config();

// S3 클라이언트 설정
const s3 = new S3Client({ region: process.env.AWS_REGION }); // AWS 지역 설정 (예: 'us-east-1')
const bucketName = process.env.AWS_S3_BUCKET_NAME; // S3 버킷 이름

let isRecording = false; // 상태 변수: 현재 녹화 중인지 확인
let ffmpegProcess; // FFmpeg 프로세스를 제어하기 위한 변수

// 스트리밍을 시작하는 함수
export const startStream = (req, res) => {
  res.send('Stream started');
};

// 녹화를 시작하는 함수
export const startRecording = (req, res) => {
  
  if (isRecording) return res.status(400).json({ message: 'Already recording' });

  // 녹화 파일의 출력 경로 설정
  const outputPath = path.join(__dirname, '..', 'public', 'recordings', 'output.mp4');
  
  // FFmpeg 프로세스를 시작하여 녹화 실행
  ffmpegProcess = ffmpeg('udp://localhost:1234') // 입력 스트림 주소 (예: UDP)
    .videoCodec('libx264') // 비디오 코덱 설정
    .outputOptions(['-preset veryfast', '-tune zerolatency']) // FFmpeg 출력 옵션
    .save(outputPath); // 출력 파일 경로 지정

  isRecording = true; // 녹화 상태 업데이트
  res.status(200).json({ message: 'Recording started' });
};

// 녹화를 중지하는 함수
export const stopRecording = (req, res) => {
  if (!isRecording) return res.status(400).json({ message: 'Not recording' });

  // FFmpeg 녹화 완료 시 로그 출력
  ffmpegProcess.on('end', () => console.log('Recording saved'));
  ffmpegProcess.kill('SIGINT');
  isRecording = false;

  res.status(200).json({ message: 'Recording stopped' });
};

// 녹화 파일을 AWS S3에 업로드하고 데이터베이스에 경로를 저장하는 함수
export const uploadRecording = async (req, res) => {
  const file = req.file; // 업로드된 파일 가져오기
  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    // 파일을 S3에 업로드
    const fileContent = fs.readFileSync(file.path); // 파일 내용을 읽어옴
    const s3Key = `recordings/${file.filename}`; // S3에 저장될 경로

    const uploadParams = {
      Bucket: bucketName, // S3 버킷 이름
      Key: s3Key, // 저장될 파일 경로
      Body: fileContent, // 파일 내용
      ContentType: 'video/mp4', // 파일 MIME 타입
    };

    await s3.send(new PutObjectCommand(uploadParams)); // S3에 파일 업로드

    // 데이터베이스에 저장할 S3 URL 생성
    const fileUrl = `https://${bucketName}.s3.amazonaws.com/${s3Key}`;

    // 데이터베이스에 업로드된 파일 경로 저장
    await prisma.recording.create({
      data: {
        filePath: fileUrl,
        createdAt: new Date(),
      },
    });

    // 로컬 파일 삭제 (선택 사항)
    fs.unlinkSync(file.path);

    res.status(200).json({ message: 'File uploaded successfully', path: fileUrl });
  } catch (error) {
    res.status(500).json({ message: 'Upload error', error, s3, bucketName });
  }
};


