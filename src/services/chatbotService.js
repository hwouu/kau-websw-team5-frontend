import prisma from '../config/prismaClient.js';
import axios from 'axios';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

console.log('CHATGPT_API_KEY:', process.env.CHATGPT_API_KEY);

const CHATGPT_API_URL = 'https://api.openai.com/v1/chat/completions';
const CHATGPT_API_KEY = process.env.CHATGPT_API_KEY;


// 사용자별 대화 문맥 저장 객체
const userContexts = {};

// 대화 문맥 초기화 함수
export const resetContext = (userID) => {
  delete userContexts[userID]; // 특정 사용자의 문맥 삭제
};
  

// 추가
export const generateReportId = async () => {
    const lastReport = await prisma.report.findFirst({
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

export const createReportData = async (reportData) => {
    try {
        console.log('Original reportData:', reportData); // 디버깅: 원본 데이터 확인

        // `date`는 YYYY-MM-DD 형식, `time`은 HH:mm:ss 형식
        const parsedDate = new Date(reportData.date); // Prisma에서 MySQL DATE와 호환
        const [hours, minutes, seconds] = reportData.time.split(':'); // HH:mm:ss 분리
        const parsedTime = new Date(parsedDate); // 날짜와 시간을 결합
        parsedTime.setHours(hours, minutes, seconds); // 시간 설정

        console.log('Parsed Data for Prisma:', { parsedDate, parsedTime }); // 디버깅용

        const newReport = await prisma.report.create({
            data: {
                report_id: reportData.report_id,
                user_id: reportData.user_id,
                accident_type: reportData.accident_type,
                location: reportData.location,
                date: parsedDate, // ISO-8601 형식으로 Prisma에 전달
                time: parsedTime // ISO-8601 형식으로 변환된 시간
            },
        });

        console.log('Report created successfully:', newReport); // 성공 로그
        return newReport;
    } catch (error) {
        console.error('Error in createReportData:', error.message); // 오류 메시지 출력
        console.error('Error details:', error); // 전체 오류 객체 출력
        throw new Error(`데이터베이스 저장 실패: ${error.message}`); // 구체적인 오류 반환
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

// OpenAI 메시지 처리 함수
export const processMessage = async (userMessage, userID) => {
    try {
      // 사용자 문맥 가져오기, 없으면 초기화
      if (!userContexts[userID]) {
        userContexts[userID] = [
          {
            role: "system",
            content: `
                당신은 사고 분석 및 상태 보고를 위한 전문 챗봇입니다.
                다음 규칙을 반드시 따르세요:
                1. 사용자의 질문에 특정 지역 정보가 포함되어 있다면, 문맥을 확인 한 후에 문맥과 관련이 있다면 이전 대화 기록에서 해당 지역 정보와 관련된 데이터를 확인하고 답변합니다.
                - 예: "남청주 나들목 상행선에서 사고 발생이 의심됩니다" → "남청주 나들목 상행선에서 사고 발생이 확인되었습니다."
                2. 사용자가 다른 지역 정보를 질문할 경우, 이전 대화 기록과 충돌하지 않는 응답을 제공합니다.
                - 예: "남청주 사고를 물어봤는데 테헤란로 사고는 어떤가요?" → "테헤란로 사고 정보는 별도로 기록되어 있지 않습니다."
                3. 사용자가 보고한 지역에 대한 사고에 한에서 사고 처리에 관한 내용을 묻는다면 반드시 "현재 사고처리중에 있습니다." 라는 고정된 답변을 줘. 
                만약 사고자가 보고한 지역에 대한 사고가 아니라면 반드시 "해당 지역에서 발생한 사고는 없습니다" 라는 고정된 답변을 줘.
                4. 문맥과 관련 없는 질문에는 "문맥에 맞는 질문을 다시 작성해 주세요."라고 명확히 알려줍니다.
            `,
          },
        ];
      }
  
      // 사용자 메시지 추가
      userContexts[userID].push({ role: "user", content: userMessage });
  
      // OpenAI API 호출
      const response = await axios.post(
        CHATGPT_API_URL,
        {
          model: "gpt-4",
          messages: userContexts[userID],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CHATGPT_API_KEY}`,
          },
        }
      );
  
      // OpenAI 응답 추가
      const botMessage = response.data.choices[0].message.content;
      userContexts[userID].push({ role: "assistant", content: botMessage });

      // 로그로 현재 contextMessages 출력
      console.log(`[User ID: ${userID}] Current contextMessages:`, userContexts[userID]);

  
      return botMessage;
    } catch (error) {
      console.error("Error in processMessage:", error);
      throw new Error("Failed to process message with OpenAI API");
    }
  };
  
  // 문맥 초기화 시점에 호출하는 함수
  export const endConversation = (userID) => {
    resetContext(userID);
  };