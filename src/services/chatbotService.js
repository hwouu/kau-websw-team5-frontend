import dotenv from 'dotenv';
import prisma from '../config/prismaClient.js';
import axios from 'axios';
import path from 'path';

dotenv.config({ override: true });

console.log('CHATGPT_API_KEY:', process.env.CHATGPT_API_KEY);

const CHATGPT_API_URL = 'https://api.openai.com/v1/chat/completions';
const CHATGPT_API_KEY = process.env.CHATGPT_API_KEY;


// 사용자별 대화 문맥 저장 객체
const userContexts = {};

// 대화 문맥 초기화 함수
export const resetContext = (userID) => {
  delete userContexts[userID]; // 특정 사용자의 문맥 삭제
};

//추가
export const getChatGPTAnalysis = async (description) => {
    try {

        const currentDate = new Date().toISOString();

        const response = await axios.post(
            CHATGPT_API_URL,
            {
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `당신은 교통사고 신고를 분석하는 도우미입니다.
                                  현재 날짜와 시간은 "${currentDate}"입니다.
                                  사용자가 상대적인 날짜나 시간(예: '오늘', '어제', '이번 주')을 입력하면, 이를 절대적인 날짜와 시간(YYYY-MM-DD, HH:mm:ss)으로 변환하세요.
                                  사용자의 사고 설명을 분석한 뒤, JSON 형식으로 구조화된 데이터를 반환하십시오.
                                  반환되는 날짜와 시간의 형식은 반드시 "YYYY-MM-DD"와 "HH:mm:ss"로 고정해야 합니다.
                                  이후, 사용자가 사고 상황에 대한 추가적인 자료(이미지, 동영상, 실시간 스트리밍 영상)를 제공할 수 있는지 묻는 질문을 생성하십시오.
                                  JSON 형식 예시:
                                  {
                                      "분석결과": {
                                          "사고날짜": "~",
                                          "사고시간": "~",
                                          "사고장소": "~",
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

        // ChatGPT 응답 데이터 콘솔 출력
        const content = response?.data?.choices?.[0]?.message?.content;
        console.log('ChatGPT 응답 원본:', content);

        // JSON 파싱 후 반환
        const parsedContent = JSON.parse(content);
        console.log('ChatGPT 파싱된 응답:', parsedContent);

        // ChatGPT 응답 반환
        return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
        console.error('ChatGPT API Error:', error.message);
        throw new Error('ChatGPT API 호출에 실패했습니다.');
    }
};

// 보고서 생성 함수
export const createReport = async (userId, { date, time, location }) => {
    try {
        // 기존 보고서 ID 가져오기
        const lastReport = await prisma.report.findFirst({
            orderBy: {
                report_id: 'desc',
            },
            select: {
                report_id: true, // report_id 필드만 조회
            },
        });

        // 새로운 reportId 생성
        const nextReportNumber = lastReport
            ? parseInt(lastReport.report_id.split('_')[1], 10) + 1
            : 1;
        const reportId = `report_${String(nextReportNumber).padStart(3, '0')}`;

        // `date`와 `time`을 각각 적절한 형식으로 변환
        const parsedDate = new Date(date); // `date`는 YYYY-MM-DD 형식이어야 함
        const parsedTime = new Date(`1970-01-01T${time}`); // `time`은 HH:mm:ss 형식이어야 함

        // 새로운 보고서 생성
        const newReport = await prisma.report.create({
            data: {
                report_id: reportId,
                user_id: userId,
                date : parsedDate,
                time: parsedTime,
                location,
                number_of_vehicle: 0, // 기본값 설정
                accident_type: {"type":"", "severity":""}, 
                damaged_situation: null, // null 값 저장
                vehicle: null, // null 값 저장
                description: null, // null 값 저장
                fileUrl: null, // null 값 저장
                fileType: null, // null 값 저장
            },
        });

        return {
            message: '보고서 생성 성공',
            report: newReport,
        };
    } catch (error) {
        console.error('Report Creation Error:', error.message);
        throw new Error('보고서 생성 중 오류가 발생했습니다.');
    }
};
     
   

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