import { RunnableSequence, RunnableLambda } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { loadUserMemory } from "./memoryChain.js";
import { createLLM } from "./llmChain.js";
import { searchEventInfo } from "./retrievalChain.js";
import { parseUserQuery, fetchPopupsFromDB } from "../searchPopups.js";

export async function createConversationChain(userId) {
  const llm = createLLM();

  // 🔥 PromptTemplate를 반드시 사용해야 LangChain이 ChatMessage로 변환 가능
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "{system}"],
    ["user", "{input}"],
  ]);

  return RunnableSequence.from([

    // 1️⃣ STEP — 변수 준비
    RunnableLambda.from(async (input) => {
      const memoryData = await loadUserMemory(userId);
      
      // 메모리 데이터를 텍스트로 변환
      const memoryText = memoryData
        ? `과거 여행 기록: ${JSON.stringify(memoryData.travel_history || [], null, 2)}\n선호 카테고리: ${(memoryData.preferences || []).join(", ")}`
        : "과거 여행 기록이 없습니다.";

      // 사용자 메시지에서 지역/날짜 파싱
      const parsed = parseUserQuery(input.message);
      let relevantEvents = [];
      
      // 지역과 날짜가 파싱되면 해당 조건으로 검색
      if (parsed.region && parsed.startDate && parsed.endDate) {
        try {
          relevantEvents = await fetchPopupsFromDB(
            parsed.region, 
            parsed.startDate, 
            parsed.endDate
          );
          console.log(`✅ ${parsed.region} 지역 ${parsed.startDate.toISOString()} ~ ${parsed.endDate.toISOString()} 기간 검색 결과: ${relevantEvents.length}개`);
        } catch (err) {
          console.warn("⚠️ DB 검색 실패, 일반 검색으로 대체:", err.message);
        }
      } else if (parsed.region) {
        // 지역만 있으면 해당 지역의 최근/예정 이벤트 검색
        try {
          const now = new Date();
          const futureDate = new Date(now);
          futureDate.setMonth(futureDate.getMonth() + 3); // 3개월 후까지
          
          relevantEvents = await fetchPopupsFromDB(
            parsed.region,
            now,
            futureDate
          );
          console.log(`✅ ${parsed.region} 지역 일반 검색 결과: ${relevantEvents.length}개`);
        } catch (err) {
          console.warn("⚠️ 지역 검색 실패:", err.message);
        }
      }
      
      // 검색 결과가 없으면 일반 키워드 검색
      if (relevantEvents.length === 0) {
        relevantEvents = await searchEventInfo({
          keywords: ["전시", "축제", "팝업", "이벤트"],
        });
      }

      const eventList =
        relevantEvents.length > 0
          ? relevantEvents.slice(0, 10).map((e, idx) => 
              `${idx + 1}. ${e.name || e.title || "제목 없음"}\n   - 기간: ${e.period || "기간 정보 없음"}\n   - 장소: ${e.location || "장소 정보 없음"}\n   - 카테고리: ${e.category || "팝업"}`
            ).join("\n\n")
          : "관련 행사 데이터 없음";

      // 파싱된 정보 요약
      const parsedInfo = parsed.region && parsed.startDate && parsed.endDate
        ? `\n[사용자 요청 정보]\n- 지역: ${parsed.region}\n- 기간: ${parsed.startDate.toLocaleDateString('ko-KR')} ~ ${parsed.endDate.toLocaleDateString('ko-KR')}\n- 검색된 행사: ${relevantEvents.length}개`
        : "";

      // 파싱 정보에 따른 안내 메시지
      let guidance = "";
      if (!parsed.region && !parsed.startDate) {
        guidance = "\n**참고:** 사용자가 구체적인 지역이나 날짜를 명시하지 않았습니다. 일반적인 추천을 제공해주세요.";
      } else if (!parsed.region) {
        guidance = "\n**참고:** 사용자가 지역을 명시하지 않았습니다. 전국적인 추천을 제공해주세요.";
      } else if (!parsed.startDate) {
        guidance = `\n**참고:** 사용자가 날짜를 명시하지 않았습니다. ${parsed.region} 지역의 최근/예정 이벤트를 추천해주세요.`;
      }

      // 간단한 답변 형식으로 안내
      const dateInfo = parsed.startDate && parsed.endDate
        ? `${parsed.startDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}부터 ${parsed.endDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}까지`
        : parsed.startDate
        ? `${parsed.startDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}부터`
        : "";
      
      const locationInfo = parsed.region ? `${parsed.region}에서` : "";

      return {
        system: `
당신은 AI 여행 도우미입니다. 간결하고 명확하게 답변해주세요.

**절대 준수해야 할 규칙:**
1. 행사 정보(목록, 제목, 기간, 장소 등)는 절대 text 응답에 포함하지 않습니다.
2. 행사 정보는 recommendations 배열로만 반환되므로, text 응답에는 포함하지 마세요.
3. text 응답은 사용자의 질문을 자연스럽게 요약하거나 안내하는 말을 주로로 포함합니다.
4. 예시: "${dateInfo} ${locationInfo}의 행사 정보를 찾았습니다." 또는 "요청하신 조건에 맞는 행사들을 찾았습니다." 같은 간단한 안내를를 작성하세요.
5. 검색 결과가 있으면 "없습니다"라고 답변하지 마세요.
6. 검색 결과가 없으면 "있습니다"라고 답변하지 마세요.
${guidance}

[사용자 기억]
${memoryText}
${parsedInfo}

**참고:** 아래 행사 목록은 참고용이며, 절대 응답에 포함하지 마세요. 행사 정보는 별도의 recommendations 배열로만 제공됩니다.
[검색된 행사 목록 - 참고용, 응답에 포함 금지]
${eventList}
        `,
        input: input.message,
      };
    }),

    // 2️⃣ STEP — PromptTemplate 적용
    prompt,

    // 3️⃣ STEP — LLM 실행
    llm,

    // 4️⃣ STEP — 응답 텍스트만 추출
    RunnableLambda.from(async (response) => {
      return typeof response.content === "string"
        ? response.content
        : response.content?.[0]?.text || "(응답 없음)";
    })
  ]);
}
