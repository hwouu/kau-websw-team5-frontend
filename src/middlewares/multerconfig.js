import multer from 'multer';
import fs from 'fs';

// 폴더 생성 함수
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 저장 경로를 MIME 타입에 따라 분기
const getFolder = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'public/image';
  if (mimetype.startsWith('video/')) return 'public/video';
  throw new Error('지원하지 않는 파일 형식입니다.');
};

// Multer Storage 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = getFolder(file.mimetype);
    ensureDir(folder); // 폴더가 없으면 생성
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueSuffix);
  },
});

// Multer 설정 객체
const upload = multer({ storage });

export default upload;