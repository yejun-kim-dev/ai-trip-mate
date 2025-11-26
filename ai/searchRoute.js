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

    console.log("✅ 팝업 DB 검색 결과:", dbResults.length);

    /** 3. LangChain은 보조용 */
    const lcResults = await runRetrievalChain(message);

    /** ❗ 핵심: 추천 대상은 무조건 DB 결과 */
    const combinedResults = dbResults.length > 0 ? dbResults : lcResults;

    /** 4. 사용자 요청 저장 (히스토리) */
    await logUserRequest(userId, message, region);

    /** 5. 유저 취향 누적용 메모리 업데이트 */
    await saveUserMemory(userId, region, "팝업", keyword);

    /** 6. 사용자 메모리 가져오기 */
    const userMemory = await getUserMemory(userId);

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
      region,
      keyword,
      popupCount: dbResults.length,
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
