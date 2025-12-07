import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

import express from "express";
import { runRetrievalChain } from "./chains/retrievalChain.js";
import {
  parseUserQuery,
  fetchPopupsFromDB,
  summarizePopups,
} from "./searchPopups.js";

import { saveUserMemory } from "./chains/saveUserMemory.js";
import { getUserMemory } from "./chains/getUserMemory.js";
import { logUserRequest } from "./chains/logUserRequest.js";
import { extractKeyword } from "../utils/extractKeyword.js";
import { deriveCategoryFromDb, resolvePopupCategory } from "../utils/categoryUtils.js";

const router = express.Router();

router.post("/recommend", async (req, res) => {
  console.log("📡 [recommend] 요청:", req.body);

  try {
    const { message, userId = "user001" } = req.body;

    /** 1. 사용자 질문 파싱 */
    const { region, startDate, endDate } = parseUserQuery(message);
    const keyword = extractKeyword(message);

    console.log("✅ 파싱 결과:", { region, startDate, endDate, keyword });

    if (!region || !startDate || !endDate) {
      return res.json({
        error: "지역 또는 날짜 인식 실패",
        parsed: { region, startDate, endDate },
      });
    }

    /** 2. 팝업 DB 검색 */
    const dbResults = await fetchPopupsFromDB(region, startDate, endDate);

    console.log(
      "카테고리 샘플:",
      dbResults.slice(0, 10).map((p) => p.category)
    );

    console.log("✅ 팝업 DB 검색 결과:", dbResults.length);

    /** 3. LangChain은 보조용 */
    const lcResults = await runRetrievalChain(message);

    /** ❗ 핵심: 추천 대상은 무조건 DB 결과 */
    const combinedResults = dbResults.length > 0 ? dbResults : lcResults;

    /** 4. 사용자 요청 저장 (히스토리) */
    await logUserRequest(userId, message, region);

    /** 5. 유저 취향 누적용 메모리 업데이트 */
    const memoryCategory = deriveCategoryFromDb(dbResults);
    await saveUserMemory(userId, region, memoryCategory, keyword);

    /** 6. 사용자 메모리 가져오기 */
    const userMemory = await getUserMemory(userId);
    /** ✅ 7. 추천 결과를 user_trip_items에 자동 저장 */

    // 1. 이전 일정 초기화
    await supabase.from("user_trip_items").delete().eq("user_id", userId);

    // 2. 추천 결과 없으면 저장 안 함
    if (dbResults.length > 0) {
      const tripItems = dbResults.map((popup) => ({
        user_id: userId,
        period_start: startDate,
        period_end: endDate,
        address: popup.address,
        open_time: popup.open_time || "10:00",
        close_time: popup.close_time || "21:00",
        popup_name: popup.name || popup.title || popup.popup_name,
        category: popup.category,
      }));

      const { error: tripInsertError } = await supabase
        .from("user_trip_items")
        .insert(tripItems);

      if (tripInsertError) {
        console.error("❌ user_trip_items 저장 실패:", tripInsertError.message);
      } else {
        console.log("✅ user_trip_items 저장 완료:", tripItems.length, "개");
      }
    } else {
      console.log("⚠️ 추천 결과 없음 → 저장 스킵");
    }

    /** 7. Gemini 추천 생성 */
    const summary = await summarizePopups(
      combinedResults,
      region,
      startDate,
      endDate,
      userId
    );

    /** ✅ 응답: user_memory는 참고용으로만 */
    return res.json({
      text: summary,
      popupResults: dbResults, // ✅ 진짜 추천 결과
      // ✅ 참고용
    });
  } catch (err) {
    console.error("❌ recommend 에러:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
