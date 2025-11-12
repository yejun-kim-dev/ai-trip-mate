import "dotenv/config";
import axios from "axios";
import { parseStringPromise } from "xml2js";
import { createClient } from "@supabase/supabase-js";

// ✅ Supabase 연결
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ 문화포털 문화공감 API (공개 RSS)
async function fetchCultureTheme() {
  const url = "http://175.125.91.94/openapi/feed/rss/theme";

  try {
    console.log("📡 한국문화정보원 문화공감 데이터 요청 중...");
    const res = await axios.get(url, { responseType: "text" });

    // XML -> JSON 변환
    const parsed = await parseStringPromise(res.data, { explicitArray: false });
    const items = parsed?.rss?.channel?.item;
    if (!items) {
      console.log("⚠️ 데이터가 없습니다.");
      return;
    }

    const events = Array.isArray(items) ? items : [items];

    // ✅ Supabase DB 포맷 맞춰서 변환
    const formatted = events.map((e) => ({
      name: e.title || null,
      period: null, // RSS에는 기간이 따로 없음
      location: null,
      hours: null,
      category: "문화행사",
      source: "한국문화정보원 문화공감 API",
      url: e.link || null,
    }));

    console.log(`📦 ${formatted.length}개 데이터 변환 완료`);

    // ✅ Supabase에 저장
    const { error } = await supabase
      .from("popups")
      .upsert(formatted, { onConflict: "url" });

    if (error) console.error("❌ Supabase 저장 실패:", error.message);
    else console.log("✅ Supabase 저장 완료!");
  } catch (err) {
    console.error("❌ 요청 오류:", err.message);
  }
}

fetchCultureTheme();
