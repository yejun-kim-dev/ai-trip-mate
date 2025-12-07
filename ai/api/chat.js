import express from "express";
import { extractMemoryConcepts } from "./memory/memoryExtractor.js";
import { updateMemory } from "./memory/memoryUpdater.js";
import { loadMemory } from "./memory/memoryRepository.js";
import { analyzeUserMemory } from "./memory/memoryAnalyzer.js";
import { createConversationChain } from "../chains/conversationChain.js";
import { parseUserQuery, fetchPopupsFromDB } from "../searchPopups.js";
import { extractKeyword } from "../../utils/extractKeyword.js";
import { saveUserMemory } from "../chains/saveUserMemory.js";
import { logUserRequest } from "../chains/logUserRequest.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { userId, message, tripData, excludedTitles, conversationContext } = req.body;

    if (!message) return res.status(400).json({ error: "메시지가 없습니다." });
    if (!userId) return res.status(400).json({ error: "userId 필요" });

    const excludedTitleSet = new Set((excludedTitles || []).map(t => t.toLowerCase().trim()));

    // 🌟 이전 대화 맥락
    const contextRegion = conversationContext?.region || null;
    const contextStartDate = conversationContext?.startDate ? new Date(conversationContext.startDate) : null;
    const contextEndDate = conversationContext?.endDate ? new Date(conversationContext.endDate) : null;
    const contextCategory = conversationContext?.category || null;

    // 📌 1) 사용자 메모리 로드
    const userMemory = await loadMemory(userId);
    const memorySummary = analyzeUserMemory(userMemory);

    // 📌 2) 새 개념 추출
    const extracted = extractMemoryConcepts(message);
    await updateMemory(userId, extracted);

    // 📌 3) LLM 실행
    const chain = await createConversationChain(userId);
    const aiText = await chain.invoke({ message });

    // -------------------------------------------------------
    // 🔥 4) 파싱된 검색 조건 (지역 / 날짜 / 카테고리)
    // -------------------------------------------------------
    let { region, startDate, endDate, category } = parseUserQuery(message);

    // 🔄 지역 / 날짜 / 카테고리 fallback
    if (!region && contextRegion) region = contextRegion;
    if (!startDate && contextStartDate) startDate = contextStartDate;
    if (!endDate && contextEndDate) endDate = contextEndDate;
    if (!category && contextCategory) category = contextCategory;

    // tripData fallback
    if (!region && tripData?.city) region = tripData.city;
    if (!region && tripData?.location) region = tripData.location;
    if (!startDate && tripData?.dateRange) {
      startDate = new Date(tripData.dateRange.start);
      endDate = new Date(tripData.dateRange.end);
    }

    // 🌟 월 단위 자동 확장
    if (startDate && endDate) {
      const m = message.match(/(\d{1,2})월/);
      if (m) {
        const month = parseInt(m[1]);
        const y = startDate.getFullYear();

        startDate = new Date(y, month - 1, 1);
        endDate = new Date(y, month, 0);
      }
    }

    console.log("📌 검색 조건:", { region, startDate, endDate, category });

    // -------------------------------------------------------
    // 🔥 5) DB 검색 (category 기반 정확 검색)
    // -------------------------------------------------------
    let dbResults = [];

    if (region && startDate && endDate && category) {
      dbResults = await fetchPopupsFromDB(region, startDate, endDate, category);

    } else if (region && category) {
      const now = new Date();
      const future = new Date();
      future.setMonth(future.getMonth() + 6);
      dbResults = await fetchPopupsFromDB(region, now, future, category);

    } else if (startDate && endDate && category) {
      dbResults = await fetchPopupsFromDB(region, startDate, endDate, category);

    } else if (category) {
      // 🌟 카테고리만 주어진 경우: 전국 카테고리 검색
      console.log("📌 카테고리 단독 검색 실행");
      dbResults = await fetchPopupsFromDB(null, new Date(), new Date("2100-01-01"), category);
    }

    // -------------------------------------------------------
    // 🔥 6) fallback (category 유지)
    // -------------------------------------------------------
    if (dbResults.length === 0 && category) {
      console.log("⚠️ 결과 없음 → fallback (category 유지)");

      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

      const { data } = await supabase
        .from("popups")
        .select("*")
        .eq("category", category)
        .limit(100);

      dbResults = data || [];
    }

    // -------------------------------------------------------
    // 🔥 7) 추천 5개 생성
    // -------------------------------------------------------
    const uniqueResults = dbResults.filter((popup) => {
      const title = (popup.name || popup.title || "").toLowerCase().trim();
      return title && !excludedTitleSet.has(title);
    });

    const recommendations = uniqueResults.slice(0, 5).map((popup) => ({
      title: popup.name || popup.title || "제목 없음",
      period: popup.period || "기간 정보 없음",
      location: popup.location || "장소 없음",
      category: popup.category || category,
    }));

    console.log("🎯 최종 추천:", recommendations.length);

    // -------------------------------------------------------
    // 🔥 8) 결과 반환
    // -------------------------------------------------------
    res.json({
      text: aiText,
      recommendations,
      memorySummary,
      extractedConcepts: extracted,
      context: {
        region,
        startDate,
        endDate,
        category,
      },
    });

  } catch (err) {
    console.error("❌ chat.js 오류:", err);
    res.status(500).json({ error: "AI 응답 생성 중 오류", message: err.message });
  }
});

export default router;
