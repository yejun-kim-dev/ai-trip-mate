import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import * as chrono from "chrono-node";
import { createClient } from "@supabase/supabase-js";
import { getGeminiResponse } from "./api/gemini.js";

// 유저 메모리
import { getUserMemory } from "./chains/getUserMemory.js";

// ESM 환경에서 __dirname 생성
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

/* -------------------------------------------------------
    🔧 날짜 정규화 함수
------------------------------------------------------- */
function normalizeDate(str) {
  if (!str) return null;
  str = str.trim();

  if (/^\d{8}$/.test(str)) {
    const y = str.slice(0, 4);
    const m = str.slice(4, 6);
    const d = str.slice(6, 8);
    return `${y}-${m}-${d}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const parsed = chrono.parseDate(str);
  if (!parsed) return null;

  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

/* -------------------------------------------------------
    🔧 기간 문자열 → 시작/종료로 분리
------------------------------------------------------- */
function extractStartEnd(periodStr) {
  if (!periodStr) return [null, null];
  const [a, b] = periodStr.split("~").map((s) => s.trim());
  return [normalizeDate(a), normalizeDate(b || a)];
}

/* -------------------------------------------------------
    🔥 사용자 채팅 → 지역 / 날짜 / 카테고리 추출
    📌 카테고리 추가됨
------------------------------------------------------- */
export function parseUserQuery(message) {
  const regionRegex =
    /(서울|잠실|부산|대구|대전|광주|인천|제주|수원|울산|성수|홍대|건대|강남|신촌|해운대|서면|부평|경기|경기도|강원|강원도|충청|충청도|전라|전라도|경상|경상도)/;

  const region = message.match(regionRegex)?.[0] || null;

  // ✅ 카테고리 추출 추가
  const categoryRegex = /(팝업|전시|공연|축제|뮤지컬|페스티벌|이벤트)/;
  const category = message.match(categoryRegex)?.[1] || null;

  let startDate = null;
  let endDate = null;

  // chrono 우선 파싱
  const parsed = chrono.parse(message, new Date(), { forwardDate: true });

  if (parsed.length > 0) {
    const first = parsed[0];
    startDate = first.start?.date();
    endDate = first.end?.date() || first.start?.date();
  }

  // 월만 언급된 경우
  if (!startDate || !endDate) {
    const monthOnly = /(\d{1,2})월/;
    const m = message.match(monthOnly);

    if (m) {
      const month = parseInt(m[1]);
      const now = new Date();
      let year = now.getFullYear();

      if (month < now.getMonth() + 1) year += 1;

      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    }
  }

  console.log("🔍 parseUserQuery 최종 결과:", {
    region,
    startDate,
    endDate,
    category,
  });

  return { region, startDate, endDate, category };
}

/* -------------------------------------------------------
    🔥 DB 연결
------------------------------------------------------- */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* -------------------------------------------------------
    🔥 DB 팝업 검색 — category 직접 사용 (중요!)
------------------------------------------------------- */
export async function fetchPopupsFromDB(region, startDate, endDate, category) {
  let query = supabase.from("popups").select("*");

  if (region) {
    query = query.ilike("location", `%${region}%`);
  }

  // 📌 카테고리 컬럼을 이용한 정확한 필터 (핵심)
  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw error;

  // 날짜 필터
  const start = new Date(startDate);
  const end = new Date(endDate);

  return data.filter((p) => {
    const [ps, pe] = extractStartEnd(p.period);
    if (!ps || !pe) return false;

    const s = new Date(ps);
    const e = new Date(pe);

    return e >= start && s <= end;
  });
}

/* -------------------------------------------------------
    Gemini 요약
------------------------------------------------------- */
export async function summarizePopups(
  popups,
  region,
  startDate,
  endDate,
  userId = "user001"
) {
  const memoryData = await getUserMemory(userId);

  const text = popups
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} / 지역:${p.location} / 기간:${p.period} / 카테고리:${p.category}`
    )
    .join("\n");

  const prompt = `
아래 문장을 그대로 출력하라.

${region}의 ${popups.length}개의 행사 목록입니다.

⚠ 줄바꿈 금지
⚠ 설명 금지
⚠ 다른 문장 금지
`;

  const result = await getGeminiResponse(prompt);
  return result.replace(/\n/g, "").trim();
}
