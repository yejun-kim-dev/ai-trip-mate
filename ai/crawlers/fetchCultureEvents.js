import "dotenv/config";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FROM = "20100101";
const TO = "20301231";

export async function fetchCultureEvents() {
  let page = 1;
  const rowsPerPage = 100;

  while (true) {
    const url = `https://www.culture.go.kr/openapi/rest/publicperformancedisplays/period?serviceKey=${process.env.CULTURE_API_SERVICE_KEY}&from=${FROM}&to=${TO}&cPage=${page}&rows=${rowsPerPage}&_type=json`;

    try {
      const res = await axios.get(url);

      const items = res?.data?.response?.body?.items?.item;

      if (!items || items.length === 0) {
        console.log(`✅ 데이터 수집 완료 (총 ${page - 1} 페이지)`);
        break;
      }

      const formatted = items.map((e) => ({
        category: "공연/문화행사",
        name: e.prfnm || null,
        period: `${e.prfpdfrom} ~ ${e.prfpdto}`,
        location: e.fcltynm || null,
        hours: null,
        source: "문화체육관광부 API",
        url: e.mt20id ? `https://www.kopis.or.kr/por/perf/${e.mt20id}` : null,
      }));

      const { error } = await supabase
        .from("popups")
        .upsert(formatted, { onConflict: "url" });

      if (error) console.error("❌ DB 저장 실패:", error.message);
      else console.log(`✅ ${page}페이지 저장 완료: ${formatted.length}개`);

      page++;
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error("❌ API 요청 실패:", err.message);
      break;
    }
  }
}

fetchCultureEvents();
