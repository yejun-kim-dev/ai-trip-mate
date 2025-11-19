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
    if (!userId) return res.status(400).json({ error: "userId가 필요합니다." });

    // 1️⃣ 사용자 기억 로드 + 분석
    const userMemory = await loadMemory(userId);
    const memorySummary = analyzeUserMemory(userMemory);

    // 2️⃣ 새 대화에서 개념 추출
    const extracted = extractMemoryConcepts(message);

    // 3️⃣ 기억 업데이트 및 반영
    const updatedMemory = await updateMemory(userId, extracted);

    // 4️⃣ AI 프롬프트 구성
    const aiPrompt = `
당신은 개인 맞춤 여행 큐레이터 AI입니다.
당신은 사용자의 과거 대화 및 여행 기록을 모두 기억하며,
그 사람의 취향을 이해한 후 맞춤형 제안을 제공합니다.

[사용자 과거 여행 패턴 요약]
- 자주 방문한 도시: ${memorySummary.topCities.join(", ") || "없음"}
- 선호 카테고리: ${memorySummary.topCategories.join(", ") || "없음"}
- 선호 브랜드/키워드: ${memorySummary.topBrands.join(", ") || "없음"}

[사용자의 최신 요청]
"${message}"

[추출된 개념 요약]
도시: ${extracted.city || "없음"}
날짜: ${extracted.dateRange || "없음"}
동반자: ${(extracted.companions || []).join(", ") || "없음"}
카테고리: ${(extracted.categories || []).join(", ") || "없음"}
브랜드: ${(extracted.brandOrKeyword || []).join(", ") || "없음"}
의도: ${extracted.intent || "없음"}

위 정보를 종합하여 사용자의 **기존 취향 + 현재 요청**에 최적화된 여행 콘텐츠를 추천하세요.
`;

    // 5️⃣ Gemini 호출
    const aiReply = await getGeminiResponse(aiPrompt);

    // 6️⃣ 결과 반환
    res.json({
      reply: aiReply,
      memorySummary,
      extractedConcepts: extracted,
      savedMemory: updatedMemory,
    });
  } catch (err) {
    console.error("❌ chat.js 오류:", err);
    res.status(500).json({ error: "AI 응답 생성 중 오류" });
  }
});

export default router;
