// ai/searchPopups.js
import "dotenv/config";
import * as chrono from "chrono-node";
import { createClient } from "@supabase/supabase-js";
import { getGeminiResponse } from "./api/gemini.js"; // ← 서버용 Gemini API 호출

// ==============================
// 날짜 형식 정규화
// ==============================
function normalizeDate(str) {
  if (!str) return null;
  str = str.trim();

  // 20240102 → 2024-01-02
  if (/^\d{8}$/.test(str)) {
    const y = str.slice(0, 4);
    const m = str.slice(4, 6);
    const d = str.slice(6, 8);
    return `${y}-${m}-${d}`;
  }

  // 2024-01-02 형태면 그대로
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // 그 외 → chrono로 파싱
  const parsed = chrono.parseDate(str);
  if (!parsed) return null;

  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

// ==============================
// 기간 문자열 파싱
// ==============================
function extractStartEnd(periodStr) {
  if (!periodStr) return [null, null];
  const [a, b] = periodStr.split("~").map((s) => s.trim());
  return [normalizeDate(a), normalizeDate(b || a)];
}

// ==============================
// 사용자 질문 → 지역 + 날짜 추출
// ==============================
export function parseUserQuery(message) {
  const regionRegex =
    /(서울|잠실|부산|대구|대전|광주|인천|제주|수원|울산|성수|홍대|건대|강남|신촌|해운대|서면|부평)/;

  const region = message.match(regionRegex)?.[0] || null;

  const dateRegex = /(\d{1,2})월\s*(\d{1,2})일?/g;
  const found = [...message.matchAll(dateRegex)];
  const year = new Date().getFullYear();

  let startDate = null;
  let endDate = null;

  if (found.length >= 2) {
    startDate = new Date(`${year}-${found[0][1]}-${found[0][2]}`);
    endDate = new Date(`${year}-${found[1][1]}-${found[1][2]}`);
  } else if (found.length === 1) {
    startDate = new Date(`${year}-${found[0][1]}-${found[0][2]}`);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3); // 기본 3일
  } else {
    const parsed = chrono.parse(message);
    if (parsed.length > 0) {
      startDate = parsed[0].start?.date();
      endDate = parsed[0].end?.date() || startDate;
    }
  }

  console.log("🔍 parseUserQuery 최종 결과:", { region, startDate, endDate });
  return { region, startDate, endDate };
}

// ==============================
// Supabase에서 팝업 검색
// ==============================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function fetchPopupsFromDB(region, startDate, endDate) {
  const { data, error } = await supabase
    .from("popups")
    .select("*")
    .ilike("location", `%${region}%`);

  if (error) throw error;

  const userStart = new Date(startDate);
  const userEnd = new Date(endDate);

  return data.filter((p) => {
    const [ps, pe] = extractStartEnd(p.period);
    if (!ps || !pe) return false;

    const popupStart = new Date(ps);
    const popupEnd = new Date(pe);

    // 날짜 범위 겹치는지 확인
    return popupEnd >= userStart && popupStart <= userEnd;
  });
}

// ==============================
// Gemini 요약 생성
// ==============================
export async function summarizePopups(popups, region, startDate, endDate) {
  const list = popups
    .map((p) => `• ${p.name} (${p.period}, ${p.location})`)
    .join("\n");

  const prompt = `
너는 여행 큐레이터야.
사용자는 ${region}에 ${startDate.toLocaleDateString()}~${endDate.toLocaleDateString()} 여행을 가.
다음은 해당 날짜에 열리는 팝업 목록이야:

${list}

여기서 가장 흥미로운 팝업 3개만 골라서 간단하게 추천해줘.
`;

  return await getGeminiResponse(prompt);
}
