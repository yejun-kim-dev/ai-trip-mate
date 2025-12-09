
import express from "express";
import { fetchUserTripItems } from "../services/tripService.js";

const router = express.Router();

/* ============================================================
   🛠️ [유틸] 날짜 배열 생성기 (예: 12.23 ~ 12.25 -> 3일치 날짜 리스트)
============================================================ */
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

/* ============================================================
   🤖 [AI 엔진] 단순 균등 분배 로직 (무조건 채워넣기)
============================================================ */
router.post("/optimize-trip", async (req, res) => {
  try {
    const { userId, tripStart, tripEnd } = req.body;

    console.log(`🤖 AI 최적화 요청: ${userId}, ${tripStart} ~ ${tripEnd}`);

    // 1. 여행 날짜 리스트 생성
    const days = getDaysArray(tripStart, tripEnd);
    const totalDays = days.length;

    // 2. DB에서 아이템 가져오기 (우리가 만든 tripService가 빈 값도 다 채워줌)
    const items = await fetchUserTripItems(userId, tripStart, tripEnd);
    console.log(`📦 가져온 아이템 개수: ${items.length}개`);

    // 3. 아이템이 하나도 없으면 빈 라우트 반환
    if (items.length === 0) {
      return res.json({ ok: true, route: {} });
    }

    // 4. 아이템 섞기 (랜덤성 추가 - 원치 않으면 제거 가능)
    // items.sort(() => Math.random() - 0.5);

    // 5. 날짜별로 아이템 분배 (N등분)
    const route = {};
    
    // 빈 날짜 미리 세팅
    days.forEach(day => { route[day] = []; });

    // 아이템을 하루씩 돌아가며 넣기 (Round Robin)
    items.forEach((item, index) => {
      const dayIndex = index % totalDays; // 0, 1, 2, 0, 1, 2...
      const targetDate = days[dayIndex];
      
      route[targetDate].push({
        ...item,
        visit_date: targetDate, // 날짜를 여행 날짜로 강제 변경
        visit_order: route[targetDate].length + 1 // 순서 부여
      });
    });

    console.log("✅ 일정 생성 완료:", Object.keys(route));
    return res.json({ ok: true, route });

  } catch (err) {
    console.error("❌ optimize-trip error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router;
