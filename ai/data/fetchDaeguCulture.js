import "dotenv/config";
import axios from "axios";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchDaeguCultureEvents() {
  const url =
    "https://www.dtro.or.kr/open_content_new/ko/culture/culture_program_list.do";

  try {
    console.log("📡 대구교통공사 문화행사 페이지 요청 중...");
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    const $ = cheerio.load(res.data);
    const events = [];

    $(".program_list ul li").each((i, el) => {
      const name = $(el).find(".tit").text().trim();
      const period = $(el).find(".date").text().trim();
      const location = "대구 도시철도역"; // 기본값
      const category = "문화행사";
      const source = "대구교통공사 홈페이지";
      const url = "https://www.dtro.or.kr" + $(el).find("a").attr("href");
      const hours = null;

      if (name) {
        events.push({ name, period, location, hours, category, source, url });
      }
    });

    console.log(`📦 ${events.length}개 데이터 추출됨`);

    const { error } = await supabase
      .from("popups")
      .upsert(events, { onConflict: "url" });

    if (error) console.error("❌ Supabase 저장 실패:", error.message);
    else console.log("✅ Supabase 저장 완료!");
  } catch (err) {
    console.error("❌ 요청 중 오류 발생:", err.message);
  }
}

fetchDaeguCultureEvents();
