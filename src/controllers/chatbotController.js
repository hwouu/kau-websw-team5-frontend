import * as chatbotService from '../services/chatbotService.js';

export const getWelcomeMessage = (req, res) => {
    res.status(200).json({
        message: '안녕하세요! 교통사고 신고 접수를 도와드리는 챗봇입니다. 사고 상황에 대해 알려주세요.',
    });
}

export const createReport = async (req, res) => {
    try {
        const userID = req.user?.userId;
        const report_id = await chatbotService.generateReportId();
        const reportData = { ...req.body, user_id: userID, report_id };

        if (!reportData.report_id || !reportData.location || !reportData.date || !reportData.time || !reportData.accident_type) {
            return res.status(400).json({ message: '모든 필수 필드를 입력해주세요.' });
        }

        const newReport = await chatbotService.createReportData(reportData);
        res.status(201).json({
            message: '보고서가 성공적으로 생성되었습니다.',
            report: newReport,
        });
    } catch (error) {
        console.error('Error in createReport:', error.message);
        console.error(error.stack);
        res.status(500).json({ message: '보고서 생성 중 오류가 발생했습니다.', error: error.message });
    }
};

export const analyzeAccident = async (req, res) => {
    try {
        const { description } = req.body;

        // 요청 본문 유효성 검사
        if (!description) {
            return res.status(400).json({
                message: 'description 필드는 필수입니다.',
            });
        }

        // ChatGPT API 호출
        const structuredData = await chatbotService.getChatGPTAnalysis(description);

        // 결과 반환
        res.status(200).json({
            message: '분석 성공',
            data: structuredData,
        });
    } catch (error) {
        console.error('Controller Error:', error.message);
        res.status(500).json({
            message: '분석 중 오류가 발생했습니다.',
            error: error.message,
        });
    }
};

export const reportAccident = async (req, res) => {
    try {
        const { time, location, vehicleNumber, description } = req.body;
        const uploadedFiles = req.files || [];

        // ChatGPT API 호출을 통해 설명 분석
        const gptResponse = await chatbotService.getChatGPTAnalysis(description);

        // 최종 보고서 생성
        const report = await chatbotService.createReport({
            time,
            location,
            vehicleNumber,
            description,
            gptAnalysis: gptResponse,
            uploadedFiles,
        });

        res.status(201).json({
            message: 'Accident reported successfully.',
            report,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to report accident.', error });
    }
};
