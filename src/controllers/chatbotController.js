import * as chatbotService from '../services/chatbotService.js';
import prisma from '../config/prismaClient.js';
import axios from 'axios';
import { analyzeAccidentImages } from '../services/LLMService.js';

export const getWelcomeMessage = (req, res) => {
    res.status(200).json({
        message: '안녕하세요! 교통사고 신고 접수를 도와드리는 챗봇입니다. 사고 상황에 대해 알려주세요.',
    });
}

// 삭제
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
        const userId = req.user?.userId; // 사용자 ID 가져오기

        // 요청 본문 유효성 검사
        if (!description) {
            return res.status(400).json({
                message: 'description 필드는 필수입니다.',
            });
        }

        if (!userId) {
            return res.status(401).json({
                message: '로그인이 필요합니다.',
            });
        }

        // ChatGPT API 호출
        const structuredData = await chatbotService.getChatGPTAnalysis(description);

        // `structuredData.분석결과`에서 필요한 데이터 추출
        const { 사고날짜: date, 사고시간: time, 사고장소: location } = structuredData.분석결과;

        // 보고서 생성
        const reportResponse = await chatbotService.createReport(userId, { date, time, location });

        // 결과 반환
        res.status(200).json({
            message: '분석 성공 및 보고서 생성 성공',
            data: {
                analysis: structuredData,
                report: reportResponse,
            },
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
        if (!report_id || !fileUrl || !fileType || !Array.isArray(fileUrl)) {
            console.error("Invalid request body:", req.body);
            return res.status(400).json({ message: '필수 필드 (report_id, fileUrl, fileType)를 모두 입력해주세요.' });
        }

        console.log("Starting LLM analysis for file URLs:", fileUrl);

        // analyzeAccidentImages 함수 호출 시 fileUrl 직접 전달
        const llmResponse = await analyzeAccidentImages({ fileUrl });
        
        if (!llmResponse || !llmResponse.analysis) {
            console.error("Invalid LLM response:", llmResponse);
            return res.status(500).json({ message: 'LLM 서버에서 유효한 데이터를 반환하지 않았습니다.' });
        }

        const { analysis } = llmResponse; // LLM 분석 결과 데이터
        // 필드 유효성 검사
        if (
            !analysis.description || 
            !analysis.accident_type || 
            !analysis.damaged_situation || 
            !analysis.number_of_vehicle || 
            !Array.isArray(analysis.vehicles)
        ) {
            console.warn("Analysis data missing required fields:", analysis);
            return res.status(500).json({ message: 'LLM 분석 결과가 유효하지 않습니다.' });
        }

        // Prisma를 사용하여 데이터 업데이트
        const updatedReport = await prisma.report.update({
            where: { report_id },
            data: {
                accident_type: analysis.accident_type,
                damaged_situation: analysis.damaged_situation,
                number_of_vehicle: analysis.number_of_vehicle,
                vehicle: analysis.vehicles,
                description: analysis.description,
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