// ai/api/tripOptimizeRoute.js
import express from "express";

const router = express.Router();

// ✅ 거리 계산 함수
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // km
}

// ✅ 영업시간 체크 함수
function isOpen(place, currentTime) {
  // open_time, close_time 이 null이면 그냥 통과
  if (!place.open_time || !place.close_time) return true;

  const toNum = (t) => parseInt(t.replace(":", ""), 10);

  const now = toNum(currentTime); // "1100" 이런 식
  const open = toNum(place.open_time);
  const close = toNum(place.close_time);

  return now >= open && now <= close;
}

// ✅ 핵심: 정렬 함수
function optimizeRoute(places) {
  if (places.length === 0) return [];

  let current = places[0]; // 시작점을 일단 첫 장소로
  let currentTime = "11:00"; // 기본 시작 시간
  const remaining = [...places];
  const result = [];

  while (remaining.length > 0) {
    // 아직 방문 안 한 곳 중에서,
    // 지금 시간에 열려 있고, 가장 가까운 곳을 찾기
    let nextIndex = -1;
    let bestDist = Infinity;

    remaining.forEach((p, idx) => {
      if (!isOpen(p, currentTime)) return;

      const dist = getDistance(
        current.latitude,
        current.longitude,
        p.latitude,
        p.longitude
      );

      if (dist < bestDist) {
        bestDist = dist;
        nextIndex = idx;
      }
    });

    // 만약 영업시간 때문에 갈 수 있는 곳이 없으면,
    // 그냥 남은 것 중 첫 번째로 간다
    if (nextIndex === -1) nextIndex = 0;

    const next = remaining.splice(nextIndex, 1)[0];

    result.push(next);
    current = next;

    // 대충 1시간 지나간 걸로 치기 (이동+체류 시간)
    // 진짜로 시간 계산 정확히 하고 싶으면 나중에 개선
    const [h, m] = currentTime.split(":").map(Number);
    const newMinutes = h * 60 + m + 60;
    const newH = Math.floor(newMinutes / 60);
    const newM = newMinutes % 60;
    currentTime = `${String(newH).padStart(2, "0")}:${String(newM).padStart(
      2,
      "0"
    )}`;
  }

  return result;
}

// ✅ 이게 바로 /api/trips/:tripId/optimize 에 대응되는 부분
router.get("/:tripId/optimize", async (req, res) => {
  const { tripId } = req.params;

  try {
    // supabase는 server.js에서 import 해서 넘겨줘도 되고,
    // 여기서 다시 createClient 해도 됨 (지금은 설명용)
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1) 이 여행에 속한 장소들 모두 가져오기
    const { data, error } = await supabase
      .from("user_trip_items")
      .select("*")
      .eq("trip_id", tripId);

    if (error) {
      console.error("❌ user_trip_items 조회 에러:", error);
      return res.status(500).json({ error: "DB 조회 실패" });
    }

    if (!data || data.length === 0) {
      return res.json({ optimizedRoute: [] });
    }

    // 2) 거리 + 영업시간 기준으로 최적 정렬
    const route = optimizeRoute(data);

    // 3) 프론트로 결과 보내주기
    return res.json({ optimizedRoute: route });
  } catch (e) {
    console.error("❌ 최적화 API 에러:", e);
    return res.status(500).json({ error: "서버 에러" });
  }
});

export default router;
