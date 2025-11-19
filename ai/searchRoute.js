// ai/searchRoute.js
import express from "express";
import {
  parseUserQuery,
  fetchPopupsFromDB,
  summarizePopups,
} from "./searchPopups.js";

const router = express.Router();

// 🌟 팝업 추천 API (정보 검색 모듈)
router.post("/recommend", async (req, res) => {
  console.log("📡 [recommend] 요청 수신:", req.body?.message);
  try {
    const { message } = req.body;
    const { region, startDate, endDate } = parseUserQuery(message);

    if (!region || !startDate) {
      return res.json({ text: "여행 지역과 날짜를 알려주세요." });
    }

    const popups = await fetchPopupsFromDB(region, startDate, endDate);

    if (!popups.length) {
      return res.json({
        text: `${region} 지역에 해당 기간의 팝업이 없습니다.`,
      });
    }

    const summary = await summarizePopups(popups, region, startDate, endDate);
    res.json({ text: summary, results: popups });
  } catch (err) {
    console.error("❌ /api/recommend 오류:", err);
    res.status(500).json({ error: "추천 실패" });
  }
});

export default router;
