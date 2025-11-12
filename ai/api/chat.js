import express from "express";
import { getGeminiResponse } from "./gemini.js";
import { extractMemoryConcepts } from "./memory/memoryExtractor.js";
import { updateMemory } from "./memory/memoryUpdater.js";
import { loadMemory } from "./memory/memoryRepository.js";
import { analyzeUserMemory } from "./memory/memoryAnalyzer.js";


const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!message) return res.status(400).json({ error: "메시지가 없습니다." });

    // 1️⃣ 사용자 기억 로드 + 패턴 분석
    const userMemory = await loadMemory(userId);
    const memorySummary = analyzeUserMemory(userMemory);

    // 2️⃣ 새 개념 추출
    const extracted = extractMemoryConcepts(message);

    // 3️⃣ 기억 업데이트
    const updatedMemory = await updateMemory(userId, extracted);

    // 4️⃣ Gemini 프롬프트에 “기억 + 현재 요청” 반영
    const aiPrompt = `
당신은 사용자의 여행 패턴을 기억하는 여행 추천 AI입니다.

사용자의 최근 여행 패턴 요약:
- 자주 방문한 도시: ${memorySummary.topCities.join(", ") || "없음"}
- 선호 카테고리: ${memorySummary.topCategories.join(", ") || "없음"}
- 선호 브랜드: ${memorySummary.topBrands.join(", ") || "없음"}

사용자의 현재 요청:
"${message}"

이 사용자의 취향과 최근 기록을 고려해서 자연스럽고 맞춤형으로 대답하세요.
`;

    const aiReply = await getGeminiResponse(`
        당신은 AI 여행 큐레이터입니다.
        사용자 정보 요약:
        ${JSON.stringify(memorySummary, null, 2)}
        사용자 최근 요청:
        ${message}
        이 사용자의 취향에 맞는 여행 콘텐츠를 제안하세요.
        `);

    res.json({
      reply: aiReply,
      memorySummary,
      savedMemory: updatedMemory,
    });
  } catch (err) {
    console.error("❌ chat.js 오류:", err);
    res.status(500).json({ error: "AI 응답 생성 중 오류" });
  }
});

export default router;
