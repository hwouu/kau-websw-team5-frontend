export const validateFile = (req, res, next) => {
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: '파일이 첨부되지 않았습니다.' });
  }

  // 이미지 파일 최대 6개 제한
  if (files.length > 6) {
    return res.status(400).json({ message: '이미지는 최대 6개까지 업로드할 수 있습니다.' });
  }

  next();
};
