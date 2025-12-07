import { RunnableSequence, RunnableLambda } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { loadUserMemory } from "./memoryChain.js";
import { createLLM } from "./llmChain.js";
import { parseUserQuery, fetchPopupsFromDB } from "../searchPopups.js";
import {
  extractCategoryKeywords,
  filterEventsByCategory,
  resolvePopupCategory
} from "../../utils/categoryUtils.js";

export async function createConversationChain(userId) {
  const llm = createLLM();

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "{system}"],
    ["user", "{input}"],
  ]);

  return RunnableSequence.from([

    RunnableLambda.from(async (input) => {
      const memoryData = await loadUserMemory(userId);

      const memoryText = memoryData
        ? `과거 여행 기록: ${JSON.stringify(memoryData.travel_history || [], null, 2)}\n선호 카테고리: ${// 배열이면 합치고, 문자열이면 그대로 쓰고, 없으면 빈 문자열 반환
          Array.isArray(memoryData.preferences) 
            ? memoryData.preferences.join(", ") 
            : (memoryData.preferences || "")}`
        : "과거 여행 기록이 없습니다.";

      const parsed = parseUserQuery(input.message);
      const categoryKeywords = extractCategoryKeywords(input.message);

      let dbEvents = [];

      // 지역 + 날짜 둘 다 있을 때
      if (parsed.region && parsed.startDate && parsed.endDate) {
        dbEvents = await fetchPopupsFromDB(
          parsed.region,
          parsed.startDate,
          parsed.endDate
        );
      }
      // 지역만 있을 때
      else if (parsed.region) {
        const now = new Date();
        const future = new Date();
        future.setMonth(future.getMonth() + 3);
        dbEvents = await fetchPopupsFromDB(parsed.region, now, future);
      }

      // 🧹 카테고리 필터 강제 적용 (추천 정확도 강화)
      if (categoryKeywords.length > 0) {
        const lower = categoryKeywords.map(k => k.toLowerCase());
        dbEvents = dbEvents.filter(e =>
          lower.includes(resolvePopupCategory(e).toLowerCase())
        );
      }

      const eventListForLLM =
        dbEvents.length > 0
          ? dbEvents
              .slice(0, 10)
              .map((e, idx) =>
                `${idx + 1}. ${e.name || e.title}\n   - 기간: ${e.period || "정보 없음"}\n   - 장소: ${e.location || "정보 없음"}\n   - 카테고리: ${resolvePopupCategory(e)}`
              )
              .join("\n\n")
          : "(조건에 맞는 행사 없음)";

      const parsedInfo =
        parsed.region && parsed.startDate && parsed.endDate
          ? `\n[사용자 요청 정보]\n- 지역: ${parsed.region}\n- 기간: ${parsed.startDate.toLocaleDateString()} ~ ${parsed.endDate.toLocaleDateString()}`
          : "";

      return {
        system: `
당신은 AI 여행 도우미입니다.

❗ 절대 지켜야 할 규칙:
1. text 응답에는 행사 정보(제목/기간/장소)를 절대 포함하지 마세요.
2. 행사 정보는 서버가 recommendations로 보내므로 text에는 안내 문장만 작성합니다.
3. 검색 결과가 없어도 "있습니다/없습니다" 같은 단정 표현 금지. 자연스럽게 설명만.
4. 팝업/전시/공연 등 사용자가 언급한 카테고리로 답변의 맥락을 유지하세요.

[사용자 기억]
${memoryText}

${parsedInfo}

[참고용 행사 목록 — 절대 응답에 포함 금지]
${eventListForLLM}
        `,
        input: input.message,
      };
    }),

    prompt,
    llm,

    RunnableLambda.from(async (response) => {
      return typeof response.content === "string"
        ? response.content
        : response.content?.[0]?.text;
    })
  ]);
}
