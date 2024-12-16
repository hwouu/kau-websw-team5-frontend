import prisma from '../config/prismaClient.js';

// 특정 보고서 조회
export const getReport = async (req, res) => {
  try {

    const { reportId } = req.params;

    if (!reportId) {
      return res.status(400).json({ message: 'reportId가 필요합니다.' });
    }

    const userId = req.user.userId;

    // 현재 유저 정보에서 isMaster 확인
    const user = await prisma.user.findUnique({
      where: { userID: userId },
      select: { isMaster: true },
    });

    // Prisma를 사용하여 보고서 조회
    const report = await prisma.report.findUnique({
      where: { report_id: reportId },
    });

    if (!report) {
      return res.status(404).json({ message: '해당 reportId로 보고서를 찾을 수 없습니다.' });
    }

    // 마스터이거나, 현재 사용자가 보고서 작성자일 경우에만 조회 허용
    if (!user?.isMaster && report.user_id !== userId) {
      return res.status(403).json({ message: '이 보고서를 조회할 권한이 없습니다.' });
    }

    res.status(200).json({
      message: '보고서 조회 성공',
      report,
    });
  } catch (error) {
    console.error('Error in getReportById:', error.message);
    res.status(500).json({
        message: '보고서 조회 중 오류가 발생했습니다.',
        error: error.message,
    });
  }
}

// 전체 보고서 조회 (일반 사용자 => 해당 사용자 생성 보고서만 조회, 마스터 => 모든 보고서 조회회)
export const getAllReports = async (req, res) => {
  try {

    // 인증된 사용자 ID 가져오기
    const userId = req.user.userId;

    // 현재 사용자의 정보를 조회하여 isMaster 여부 확인
    const user = await prisma.user.findUnique({
      where: { userID: userId },
      select: { isMaster: true },
    });

    let reports;

    if (user?.isMaster) {
      // 마스터: 모든 보고서 조회, fileUrl와 description이 null이 아닌 것만
      reports = await prisma.report.findMany({
        where: {
          fileUrl: { not: null },
          description: { not: null },
        }
      });
    } else {
      // 일반 사용자: 해당 사용자 보고서만 조회, 역시 null 아닌 것만
      reports = await prisma.report.findMany({
        where: {
          user_id: userId,
          fileUrl: { not: null },
          description: { not: null },
        },
      });
    }

    res.status(200).json({
      message: '전체 보고서 조회 성공',
      reports,
    });
  } catch (error) {
    console.error('Error in getAllReports:', error.message);
    res.status(500).json({
      message: '전체 보고서 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// 전체 보고서 정렬 조희 (최신순, 사고 유형) 예상
export const getSortedReports = async (req, res) => {
  try {
    // 인증된 사용자 ID 가져오기
    const userId = req.user.userId;

    // 정렬 기준 가져오기 (기본값: 최신순)
    const sortBy = req.query.sort || 'latest'; // 'latest', 'oldest', 'severity_asc', 'severity_desc' 중 선택 가능

    // 정렬 조건 설정
    let reports;

    if (sortBy === 'latest') {
      // 최신순 정렬
      reports = await prisma.report.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      });
    } else if (sortBy === 'oldest') {
      // 오래된 순 정렬
      reports = await prisma.report.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'asc' },
      });
    }  else if (sortBy === 'severity_asc') {
      // 사고 유형 약한 순 정렬 (MySQL JSON_EXTRACT 사용)
      reports = await prisma.$queryRaw`
        SELECT *
        FROM Report
        WHERE user_id = ${userId}
        ORDER BY JSON_EXTRACT(accident_type, '$.severity') ASC
      `;
    } else if (sortBy === 'severity_desc') {
      // 사고 유형 심각한 순 정렬 (MySQL JSON_EXTRACT 사용)
      reports = await prisma.$queryRaw`
        SELECT *
        FROM Report
        WHERE user_id = ${userId}
        ORDER BY JSON_EXTRACT(accident_type, '$.severity') DESC
      `;
    } else {
      // 기본값: 최신순 정렬
      reports = await prisma.report.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      });
    }

    res.status(200).json({
      message: '정렬된 보고서 조회 성공',
      reports,
    });
  } catch (error) {
    console.error('Error in getSortedReports:', error.message);
    res.status(500).json({
      message: '보고서 정렬 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// 특정 보고서 삭제
export const deleteReport = async (req, res) => {
  try {
    // 인증된 사용자 ID 가져오기
    const userId = req.user.userId;
    const { reportId } = req.params; // 삭제할 보고서 ID 가져오기
  
    // 사용자의 isMaster 여부 체크
    const user = await prisma.user.findUnique({
      where: { userID: userId },
      select: { isMaster: true },
    });

    // 삭제할 보고서 조회
    const report = await prisma.report.findUnique({
      where: { report_id: reportId },
    });

    if (!report) {
      return res.status(404).json({
        message: '해당 보고서를 찾을 수 없습니다.',
      });
    }

    // 마스터가 아니라면, 자기 자신의 보고서인지 확인
    if (!user?.isMaster && report.user_id !== userId) {
      return res.status(403).json({
        message: '이 보고서를 삭제할 권한이 없습니다.',
      });
    }

    // 보고서 삭제
    await prisma.report.delete({
      where: { report_id: reportId },
    });

    res.status(200).json({
      message: '보고서 삭제 성공',
    });
  } catch (error) {
    console.error('Error in deleteReport:', error.message);
    res.status(500).json({
      message: '보고서 삭제 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
}