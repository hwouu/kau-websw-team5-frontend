import prisma from '../config/prismaClient.js';
import axios from 'axios';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

console.log('CHATGPT_API_KEY:', process.env.CHATGPT_API_KEY);

const CHATGPT_API_URL = 'https://api.openai.com/v1/chat/completions';
const CHATGPT_API_KEY = process.env.CHATGPT_API_KEY;

// 추가
export const generateReportId = async () => {
    const lastReport = await prisma.reports.findFirst({
        orderBy: { created_at: 'desc' },
        select: { report_id: true },
    });

    if (!lastReport) {
        return '#R0001';
    }

    const lastId = lastReport.report_id;
    const numericPart = parseInt(lastId.slice(2));
    const newId = numericPart + 1;

    return `#R${String(newId).padStart(4, '0')}`;
};

export const generateCaseId = async (accidentType) => {
    const typeMap = {
        '전복사고': 'A',
        '추돌사고': 'B',
        '접촉사고': 'C',
        '기타': 'D'
    };

    const typeCode = typeMap[accidentType] || 'D';

    const lastCase = await prisma.reports.findFirst({
        where: {
            case_id: {
                startsWith: `#${typeCode}`,
            },
        },
        orderBy: { created_at: 'desc' },
        select: { case_id: true },
    });

    if (!lastCase) {
        return `#${typeCode}0001`;
    }

    const lastId = lastCase.case_id;
    const numericPart = parseInt(lastId.slice(2));
    const newId = numericPart + 1;

    return `#${typeCode}${String(newId).padStart(4, '0')}`;
};

export const createReportData = async (reportData) => {
    try {
        const newReport = await prisma.reports.create({
            data: {
                report_id: reportData.report_id,
                user_id: reportData.user_id,
                case_id: reportData.case_id,
                accident_type: reportData.accident_type,
                location: reportData.location,
                date: reportData.date,
                time: reportData.time,
                analysis_status: '분석중',
            },
        });
        return newReport;
    } catch (error) {
        console.error('Error in createReportData:', error.message);
        throw new Error('데이터베이스 저장 실패');
    }
};

//추가


export const getChatGPTAnalysis = async (description) => {
    try {
        const response = await axios.post(
            CHATGPT_API_URL,
            {
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `당신은 교통사고 신고를 분석하는 도우미입니다.
                                  사용자의 사고 설명을 분석한 뒤, JSON 형식으로 구조화된 데이터를 반환하십시오.
                                  이후, 사용자가 사고 상황에 대한 추가적인 자료(이미지, 동영상, 실시간 스트리밍 영상)를 제공할 수 있는지 묻는 질문을 생성하십시오.
                                  JSON 형식 예시:
                                  {
                                      "분석결과": {
                                          "사고일자": "~",
                                          "사고장소": "~",
                                          "사고내용": "~",
                                          "사상자": "~"
                                      },
                                      "추가질문": "사고 상황을 보다 정확히 분석하기 위해 이미지, 동영상 또는 실시간 스트리밍 영상이 있나요?"
                                  }
                                  모든 응답은 반드시 한글로 작성하세요.`
                    },
                    {
                        role: 'user',
                        content: description,
                    },
                ],
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${CHATGPT_API_KEY}`,
                },
            }
        );

        // ChatGPT 응답 반환
        return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
        console.error('ChatGPT API Error:', error.message);
        throw new Error('ChatGPT API 호출에 실패했습니다.');
    }
};

export async function createReport({ time, location, vehicleNumber, description, gptAnalysis, uploadedFiles }) {
    try {
        const filePaths = uploadedFiles.map((file) => path.join(__dirname, '../uploads', file.filename));

        const report = {
            id: Date.now(),
            time,
            location,
            vehicleNumber,
            description,
            gptAnalysis,
            files: filePaths,
        };

        console.log('Generated Report:', report);

        return report;
    } catch (error) {
        throw new Error('Error creating report: ' + error.message);
    }
}
