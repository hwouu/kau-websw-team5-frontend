import * as chatbotService from '../services/chatbotService.js';
import prisma from '../config/prismaClient.js';
import axios from 'axios';

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

// 추가 11/29
export const handleUserMessage = async (req, res) => {
    const { userMessage, endConversation } = req.body; // `endConversation` 플래그 추가
    const userID = req.user?.userId; // 사용자 ID 가져오기

    if (!userID) {
        return res.status(400).json({ error: "User not authenticated" });
    }

    try {
        if (endConversation) {
        // 대화 종료 요청 시 문맥 초기화
        chatbotService.resetContext(userID);
        return res.json({ message: "Conversation ended and context reset." });
    }

    // 메시지 처리
    const botMessage = await chatbotService.processMessage(userMessage, userID);
    res.json({ botMessage });
    } catch (error) {
        console.error("Error in handleUserMessage:", error);
        res.status(500).json({ error: "Failed to process chatbot message" });
    }
};


// 외부 LLM 서버 데이터 전송 및 응답 처리
export const sendToLLMAndUpdateDescription = async (req, res) => {
    try {
        const { report_id, fileUrl, fileType } = req.body;

        // 유효성 검사
        if (!report_id || !fileUrl || !fileType) {
            return res.status(400).json({ message: '필수 필드 (report_id, fileUrl, fileType)를 모두 입력해주세요.' });
        }

        // 외부 LLM 서버로 데이터 전송
        /*
        const LLM_API_URL = 'https://external-llm-server.com/analyze'; // 실제 LLM 서버 URL로 변경 필요
        const response = await axios.post(LLM_API_URL, {
            report_id,
            fileUrl,
            fileType,
        });

        응답에서 필요한 데이터 추출
        const { accident_type, damaged_situation, number_of_vehicle, vehicle, description } = response.data;
        */

        // 테스트용 Mock 데이터
        // accident_type: 추돌/전복/역주행 충돌/접촉
        // severity: 경미/보통/심각
        const accident_type = { type: "추돌 사고", severity: "심각" }; 
        // damage: 후미 파손/앞 범퍼 파손 등.. (자동차 데미지)
        // injury: 없음/경상자 1명/사망자 1명, 중상자 2명/ ... (인명 피해) 
        const damaged_situation = { damage: "후미 파손", injury: "없음" };
        // 사고에 관련된 차량수
        const number_of_vehicle = 2;
        // type: 승용차/SUV/경차 등...
        // color: 색깔
        // damage: 차량별 피해
        const vehicle = [
            { type: "승용차", color: "흰색", damage: "후미 파손" },
            { type: "SUV", color: "검정색", damage: "전면 파손" },
        ];
        const description = "외부 LLM 서버에서 반환된 설명입니다.";

        // 유효성 검사
        if (!description || !accident_type || !damaged_situation || !number_of_vehicle || !vehicle) {
        return res.status(500).json({ message: 'LLM 서버에서 유효한 데이터를 반환하지 않았습니다.' });
        }

        // Prisma를 사용하여 데이터 업데이트
        const updatedReport = await prisma.report.update({
        where: { report_id },
        data: {
            accident_type,
            damaged_situation,
            number_of_vehicle,
            vehicle,
            description,
        },
        });

        res.status(200).json({
            message: 'Description 업데이트 성공',
            report: updatedReport,
        });
    } catch (error) {
        console.error('Error in sendToLLMAndUpdateDescription:', error.message);
        res.status(500).json({
            message: 'LLM 서버 호출 또는 데이터 업데이트 중 오류가 발생했습니다.',
            error: error.message,
        });
    }
}