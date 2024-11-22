import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join('public', 'recordings');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // 저장 폴더
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}.mp4`); // 고유한 파일 이름으로 저장
  }
});

const upload = multer({ storage }); // 새 storage 설정 사용

export default upload;