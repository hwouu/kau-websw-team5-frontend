// 회원가입 미들웨어
export const registerMiddleware = (req, res, next) => {
  const { username, password, email } = req.body;

  // 필수 입력 항목 확인
  if (!username || !password || !email) {
    return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
  }

  // 비밀번호 유효성 검사
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: '비밀번호는 최소 8자, 최소 하나의 문자, 하나의 숫자 및 하나의 특수 문자를 포함해야 합니다.' });
  }

  // 이메일 유효성 검사
  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: '유효한 이메일 주소를 입력해주세요.' });
  }

  // 유효성 검사 통과
  next();
};