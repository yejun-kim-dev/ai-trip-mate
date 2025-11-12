// ai/data/fetchDaeguEvents.js
import "dotenv/config";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ 함수 export (server.js에서 import 가능하도록)
export async function fetchDaeguEvents() {
  const url = "https://dgfca.or.kr/api/daegu/cultural-events";

  try {
    console.log("📡 대구광역시 공연·전시 정보 요청 중...");
    const { data } = await axios.get(url);

    if (!data || !Array.isArray(data)) {
      console.log("⚠️ 데이터 형식이 예상과 다릅니다:", data);
      return [];
    }

    // ✅ Supabase에 맞게 데이터 변환
    const formatted = data.map((e) => ({
      name: e.subject || null,
      period:
        e.start_date && e.end_date
          ? `${e.start_date} ~ ${e.end_date}`
          : e.start_date || e.end_date || null,
      location: e.event_area
        ? e.place
          ? `${e.place} (${e.event_area})`
          : e.event_area
        : e.place || null,
      hours: e.time || e.event_time || null,
      category: e.event_gubun || null,
      source: "대구광역시 공연전시 API",
      url: e.homepage || `https://dgfca.or.kr/event/${e.event_seq}`,
    }));

    console.log(`📦 수집 완료: ${formatted.length}건`);
    return formatted;
  } catch (err) {
    console.error("❌ 요청 오류:", err.message);
    return [];
  }
}
