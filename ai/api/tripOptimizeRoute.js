import express from "express";
import {
  fetchUserTripItems,
  optimizeWithFixedStops,
} from "../services/tripService.js";

const router = express.Router();

/* 날짜 배열 */
function getDaysArray(start, end) {
  const arr = [];
  const dt = new Date(start);
  const endDt = new Date(end);
  while (dt <= endDt) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    arr.push(`${y}-${m}-${d}`);
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

router.post("/optimize-trip", async (req, res) => {
  try {
    const { userId, tripStart, tripEnd, tripId } = req.body;
    console.log(`🤖 AI 최적화 요청: ${userId}, trip=${tripId}`);

    const days = getDaysArray(tripStart, tripEnd);

    // 1. DB 아이템 불러오기
    const items = await fetchUserTripItems(userId, tripStart, tripEnd, tripId);
    console.log("📦 원본 아이템:", items.length);

    if (items.length === 0) {
      return res.json({ ok: false, message: "일정 데이터 없음", schedule: {} });
    }

    // 2. 거리 기반 최적화 실행
    const optimized = optimizeWithFixedStops(items);
    console.log("📍 최적화 완료. 개수:", optimized.length);

    // 3. 날짜별로 다시 배치 (균등 분배)
    const schedule = {};
    days.forEach((day) => (schedule[day] = []));

    optimized.forEach((item, i) => {
      const dayIndex = i % days.length;
      const date = days[dayIndex];

      schedule[date].push({
        ...item,
        visit_date: date,
        visit_order: schedule[date].length + 1,
      });
    });

    console.log("✅ 최종 스케줄 키:", Object.keys(schedule));

    return res.json({
      ok: true,
      message: "거리 기반 최적화 완료",
      schedule,
    });
  } catch (err) {
    console.error("❌ optimize-trip error:", err);
    return res.status(500).json({ ok: false, error: "internal server error" });
  }
});

export default router;
