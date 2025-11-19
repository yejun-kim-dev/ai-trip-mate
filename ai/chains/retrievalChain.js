// ai/chains/retrievalChain.js

import dotenv from "dotenv";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// 🔎 검색 대상 테이블 목록 (원하면 추가 가능)
const TABLES = ["popups"];

export async function searchEventInfo({
  keywords = [],
  city = null,
  startDate = null,
  endDate = null,
}) {
  const allResults = [];

  for (const table of TABLES) {
    console.log(`🔍 테이블 검색: ${table}`);

    let query = supabase.from(table).select("*");

    // 🔥 팝업 테이블의 실제 컬럼에 맞는 조건만 사용
    if (keywords.length > 0) {
      const conditions = keywords
        .map(
          (kw) =>
            `name.ilike.%${kw}%, location.ilike.%${kw}%, category.ilike.%${kw}%`
        )
        .join(",");

      query = query.or(conditions);
    }

    // 🔥 지역 필터
    if (city) {
      query = query.ilike("location", `%${city}%`);
    }

    // 🔥 날짜 필터 (popups 테이블은 날짜 없음 → 무시)
    // startDate, endDate 필요하면 period 파싱 필요. 나중에 구현 가능.

    const { data, error } = await query;

    if (error) {
      console.error(`❌ ${table} 검색 오류:`, error);
    } else if (data?.length > 0) {
      console.log(`➡ ${table} 결과 ${data.length}건`);
      allResults.push(...data);
    }
  }

  console.log(`🎯 최종 통합 결과: ${allResults.length}건`);
  return allResults;
}
