import prisma from '../config/prismaClient.js';

// 특정 보고서 조회
export const getReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    if (!reportId) {
      return res.status(400).json({ message: 'reportId가 필요합니다.' });
    }

    // Prisma를 사용하여 보고서 조회
    const report = await prisma.report.findUnique({
      where: { report_id: reportId },
    });

    if (!report) {
        return res.status(404).json({ message: '해당 reportId로 보고서를 찾을 수 없습니다.' });
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

// 전체 보고서 조회
export const getAllReports = async (req, res) => {
  try {

    // 인증된 사용자 ID 가져오기
    const userId = req.user.userId;

    // Prisma를 사용하여 모든 보고서 조회 (해당 사용자의 보고서)
    const reports = await prisma.report.findMany({
      where: { user_id: userId },
    });

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