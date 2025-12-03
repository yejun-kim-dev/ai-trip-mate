import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log("🔥 카카오 키 확인:", process.env.KAKAO_REST_API_KEY);

// ✅ period 문자열 → period_start, period_end 변환
function parsePeriod(period) {
  if (!period) return { start: null, end: null };

  // 예: "2025.01.12 ~ 2025.01.30"
  const match = period.match(
    /(\d{4}\.\d{2}\.\d{2})\s*~\s*(\d{4}\.\d{2}\.\d{2})/
  );

  if (!match) {
    console.warn("❗ period 파싱 실패:", period);
    return { start: null, end: null };
  }

  const start = match[1].replace(/\./g, "-");
  const end = match[2].replace(/\./g, "-");

  return { start, end };
}

// ✅ 주소 깨끗하게 정리
function normalizeAddress(raw) {
  if (!raw) return null;

  return raw
    .replace(/\d+층/g, "") // 4층 제거
    .replace(/[가-힣A-Za-z]*홀/g, "")
    .replace(/세미나실/g, "")
    .replace(/야외공연장/g, "")
    .replace(/\(.*?\)/g, "") // (중구) 같은 거 제거
    .trim();
}

// ✅ 카카오 API로 좌표 찾기
async function getLatLngByAddress(rawAddress) {
  const normalized = normalizeAddress(rawAddress);

  const tryQueries = [
    rawAddress,
    normalized,
    normalized + " 대구",
    rawAddress + " 대구",
  ];

  for (const query of tryQueries) {
    if (!query) continue;

    try {
      const response = await axios.get(
        "https://dapi.kakao.com/v2/local/search/keyword.json",
        {
          params: { query: query.trim() },
          headers: {
            Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
          },
        }
      );

      const result = response.data.documents[0];

      if (result) {
        console.log("✅ 좌표 성공:", query, "→", result.place_name);
        return {
          lat: parseFloat(result.y),
          lng: parseFloat(result.x),
        };
      }
    } catch (err) {
      console.log("⛔ 좌표 실패 시도:", query);
    }
  }

  console.warn("❗ 모든 시도 실패:", rawAddress);
  return { lat: null, lng: null };
}

// ✅ 메인 API
export async function addTripItem(req, res) {
  try {
    const { userId, selectedPopupIds, visitDate } = req.body;

    console.log("📦 전달받은 ID:", selectedPopupIds);
    console.log("📅 전달받은 날짜:", visitDate);

    if (!userId || !selectedPopupIds || !visitDate) {
      return res.status(400).json({
        error: "userId, visitDate 또는 selectedPopupIds가 없습니다.",
      });
    }

    // 1️⃣ 해당 날짜 기존 데이터만 삭제
    await supabase
      .from("user_trip_items")
      .delete()
      .eq("user_id", userId)
      .eq("visit_date", visitDate);

    // 2️⃣ popups 조회
    const { data: popups, error: fetchError } = await supabase
      .from("popups")
      .select("*")
      .in("id", selectedPopupIds);

    if (fetchError) {
      console.error("❌ 팝업 조회 실패:", fetchError.message);
      return res.status(500).json({ error: fetchError.message });
    }

    const tripItems = [];

    for (const popup of popups) {
      const address = popup.location || popup.address || popup.name;

      const { lat, lng } = await getLatLngByAddress(address);
      const { start, end } = parsePeriod(popup.period);

      tripItems.push({
        user_id: userId,
        visit_date: visitDate, // 🔥 핵심 추가

        popup_id: popup.id,
        popup_name: popup.name,
        address: address,
        category: popup.category,

        period_start: start,
        period_end: end,

        open_time: popup.hours || "10:00",
        close_time: "21:00",
        lat: lat,
        lng: lng,
      });
    }

    const { error: insertError } = await supabase
      .from("user_trip_items")
      .insert(tripItems);

    if (insertError) {
      console.error("❌ user_trip_items 저장 실패:", insertError.message);
      return res.status(500).json({ error: insertError.message });
    }

    return res.json({
      ok: true,
      message: `✅ ${visitDate} 일정 저장 완료`,
      savedCount: tripItems.length,
    });
  } catch (err) {
    console.error("❌ addTripItem 전체 에러:", err);
    return res.status(500).json({ error: err.message });
  }
}
