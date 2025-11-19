import { RunnableSequence, RunnableLambda } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { loadUserMemory } from "./memoryChain.js";
import { createLLM } from "./llmChain.js";
import { searchEventInfo } from "./retrievalChain.js";

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
      const memoryText = await loadUserMemory(userId);

      const events = await searchEventInfo({
        keywords: ["전시", "축제", "팝업"],
      });

      const eventList =
        events.length > 0
          ? events.map((e) => `- ${e.name || e.title} @ ${e.location}`).join("\n")
          : "관련 행사 데이터 없음";

      return {
        system: `
당신은 AI 여행 도우미입니다.

[사용자 기억]
${memoryText}

[검색된 행사]
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
