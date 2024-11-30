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
    // Prisma를 사용하여 모든 보고서 조회
    const reports = await prisma.report.findMany();

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