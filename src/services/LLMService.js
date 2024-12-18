import OpenAI from 'openai';
import dotenv from 'dotenv';

// .env 파일의 환경 변수 불러오기
dotenv.config({ override: true });

// OpenAI 인스턴스 초기화
const openai = new OpenAI({
  apiKey: process.env.CHATGPT_API_KEY // 환경 변수에서 API 키 읽기
});

// 사고 분석 프롬프트
const accPrompt = `
The images are extracted from a video and sent in chronological order.
Please determine if there are any traffic accidents or notable traffic events happen in the video. 
If yes, please give detailed descriptions in JSON format, if no, explain the reason in JSON format.
JSON output structure:
1. accident_type: {"type": "<accident type>", "severity": "<severity>"} 
  - type: "추돌", "전복", "접촉", "차량 대 차량", "차량 대 보행자" 등 대략적인 사고 유형.
  - severity: "경미", "보통", "심각" 중 하나로 사고 심각도.

2. damaged_situation: {"damage": "<damage detail>", "injury": "<injury detail>"}
  - damage: "전면 파손", "후미 파손", "경미한 흠집" 등 물적 피해 정보.
  - injury: "사망자 n명, 중상자 m명, 경상자 k명", "없음" 등 인적 피해 정보.

3. number_of_vehicle: <Number>
  - Number of vehicles involved in the accident.

4. vehicles: [{"type": "<vehicle type>", "color": "<color>", "damage": "<damage detail>"}]
  - type: "승용차", "SUV", "트럭" 등 차량 종류.
  - color: 차량의 색상.
  - damage: 각 차량의 손상된 부분 (예: "전면 파손", "후미 파손").

5. description: "<Detailed description of the accident>"
  - 사고 발생 위치: 사고가 발생한 도로 유형, 지역, 또는 랜드마크를 포함 (예: 고속도로, 교차로, 터널 등).
  - 사고 발생 상황: 사고 원인이나 주변 상황을 설명 (예: 급정거, 신호 위반, 도로 미끄러움 등).
  - 사고의 진행 상황: 사고가 어떻게 발생했는지 시간 순서에 따라 설명 (예: 차량이 급제동 후 후속 차량이 추돌함).
  - 피해 상황 정리: 피해 차량 및 인적 피해를 종합적으로 설명.
  - 추가 정보: 날씨, 시간대, 가시성 등 사고에 영향을 준 요소가 있다면 명시.

Example Response:
{
  "accident_type": {"type": "차량 대 차량", "severity": "심각"},
  "damaged_situation": {"damage": "후미 파손", "injury": "경상자 2명"},
  "number_of_vehicle": 2,
  "vehicles": [
    {"type": "승용차", "color": "흰색", "damage": "후미 파손"},
    {"type": "SUV", "color": "검정색", "damage": "전면 파손"}
  ],
  "description": "터널 내 왕복 2차선 도로에서 흰색 승용차가 급정거를 하면서 뒤따르던 검정색 SUV가 후미를 추돌한 사고입니다. 터널 내 가시성이 낮아 급정거에 즉각 반응하지 못한 것으로 보입니다. 승용차의 후미가 크게 파손되었고, SUV는 전면이 심하게 찌그러졌습니다. 경상자 2명이 발생했으며, 사고 당시 터널 내 조명이 어두웠고 도로가 미끄러운 상태였습니다."
}
`;

// 사고 이미지 분석 함수
export const analyzeAccidentImages = async ({ fileUrl }) => {
  try {
    // 유효성 검사
    if (!fileUrl || !Array.isArray(fileUrl) || fileUrl.length === 0) {
      throw new Error("fileUrl은 필수이며, 배열 형태여야 합니다.");
    }

    console.log("Received file URLs for analysis:", fileUrl); // 디버깅 로그

    // 이미지 인코딩 및 메시지 구성
    const messages = [{ role: 'user', content: accPrompt }];
    
    // 각 이미지 URL을 OpenAI 메시지에 추가
    fileUrl.forEach((url, index) => {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: `Frame ${index + 1}:` },
          { type: 'image_url', image_url: { url } } // 이미지 URL을 올바른 형식으로 추가
        ],
      });
    });

    //console.log("Sending request to OpenAI with messages:", JSON.stringify(messages, null, 2));
    //console.log("Sending request to OpenAI with messages:", messages); // 디버깅 로그

    // OpenAI GPT API 호출
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
    });

    let content = response.choices[0].message.content;

    // 불필요한 Markdown 형식 제거
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    console.log("Cleaned response from OpenAI:", content);

    // JSON 파싱
    const analysisResult = JSON.parse(content);

    // 반환
    return { analysis: analysisResult };
  } catch (error) {
    console.error("Error in analyzeAccidentImages:", error.message);
    throw new Error("이미지 분석 중 오류가 발생했습니다.");
  }
};
