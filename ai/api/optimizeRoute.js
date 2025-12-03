// ai/api/optimizeRoute.js

import supabase from "../chains/supabaseClient.js";
import { optimizeRouteByDate } from "../../utils/routeOptimizer.js";

export async function optimizeRoute(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId가 없습니다." });
    }

    console.log("✅ optimizeRoute 요청 userId:", userId);

    // 1️⃣ 유저의 여행 아이템 불러오기
    const { data: items, error } = await supabase
      .from("user_trip_items")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    if (!items || items.length === 0) {
      return res.json({
        message: "저장된 여행 아이템이 없습니다.",
        optimized: [],
      });
    }

    console.log("🔍 전체 아이템 개수:", items.length);

    // ✅ 2️⃣ 좌표 있는 것만 필터링
    const validItems = items.filter(
      (item) => item.lat !== null && item.lng !== null
    );

    console.log("✅ 좌표 있는 아이템 개수:", validItems.length);

    console.log("🧪 좌표 데이터 확인:");
    validItems.forEach((i) => {
      console.log("-", i.popup_name, i.lat, i.lng);
    });

    if (validItems.length === 0) {
      return res.json({
        message: "좌표가 있는 아이템이 없어 동선 최적화를 할 수 없습니다.",
        optimized: [],
      });
    }

    // 3️⃣ 날짜별 동선 최적화 실행
    const optimized = optimizeRouteByDate(validItems, {
      dayStart: 10 * 60,
      stayMinutes: 60,
      speedKmh: 3,
    });

    console.log("✅ 최적화 결과:", optimized);

    // 4️⃣ 최적화 결과 DB 업데이트
    for (const day of optimized) {
      for (const item of day.items) {
        await supabase
          .from("user_trip_items")
          .update({
            visit_date: item.visit_date,
            visit_order: item.visit_order,
            expected_start_time: item.expected_start_time,
            expected_end_time: item.expected_end_time,
          })
          .eq("id", item.id);
      }
    }

    return res.json({
      message: "동선 최적화 완료",
      optimized,
    });
  } catch (err) {
    console.error("🚨 optimizeRoute error:", err);
    res.status(500).json({ error: err.message });
  }
}
