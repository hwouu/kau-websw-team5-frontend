// 업로드 파일 유효성 검사
export const validateFile = (req, res, next) => {
  const files = req.files;

  const imageFiles = files.filter((file) => file.mimetype.startsWith('image/'));
  const videoFiles = files.filter((file) => file.mimetype.startsWith('video/'));

  // 이미지와 영상 동시 업로드 불가
  if (imageFiles.length > 0 && videoFiles.length > 0) {
    return res.status(400).json({ message: '이미지와 영상은 동시에 업로드할 수 없습니다.' });
  }

  // 이미지 파일 제한: 최대 6개
  if (imageFiles.length > 6) {
    return res.status(400).json({ message: '이미지는 최대 6개까지 업로드할 수 있습니다.' });
  }

  // 영상 파일 제한: 최대 1개
  if (videoFiles.length > 1) {
    return res.status(400).json({ message: '영상은 최대 1개만 업로드할 수 있습니다.' });
  }

  next();
};