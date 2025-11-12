// ai/searchPopups.js
import * as chrono from "chrono-node";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ──────────────────────────────
// 1️⃣ 날짜 문자열 표준화 함수
// ──────────────────────────────
function normalizeDate(str) {
  if (!str) return null;
  str = str.trim();

  // 20260102 → 2026-01-02
  if (/^\d{8}$/.test(str)) {
    const year = str.slice(0, 4);
    const month = str.slice(4, 6);
    const day = str.slice(6, 8);
    return `${year}-${month}-${day}`;
  }

  // ISO 형식 → 그대로 사용
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 그 외 → chrono로 파싱
  const parsed = chrono.parseDate(str);
  if (parsed) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

// ──────────────────────────────
// 2️⃣ 기간 문자열을 시작일/종료일로 분리
// ──────────────────────────────
function extractStartEnd(periodStr) {
  if (!periodStr) return [null, null];
  const [startStr, endStr] = periodStr.split("~").map((s) => s.trim());
  const start = normalizeDate(startStr);
  const end = normalizeDate(endStr || startStr);
  return [start, end];
}

// ──────────────────────────────
// 3️⃣ 사용자 입력에서 날짜/지역 추출
// ──────────────────────────────
export function parseUserQuery(userMessage) {
  const parsedDate = chrono.parse(userMessage);
  let startDate = null;
  let endDate = null;

  if (parsedDate.length > 0) {
    const range = parsedDate[0];
    startDate = range.start?.date();
    endDate = range.end?.date() || startDate;
  }

  const regions = ["서울", "부산", "대구", "제주", "성수", "홍대", "가로수길"];
  const region = regions.find((r) => userMessage.includes(r)) || null;

  return { region, startDate, endDate };
}

// ──────────────────────────────
// 4️⃣ Supabase에서 팝업 검색
// ──────────────────────────────
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

  // 사용자의 여행 기간과 팝업 기간이 겹치는지 검사
  const filtered = data.filter((p) => {
    const [popupStartStr, popupEndStr] = extractStartEnd(p.period);
    if (!popupStartStr || !popupEndStr) return false;

    const popupStart = new Date(popupStartStr);
    const popupEnd = new Date(popupEndStr);

    return popupEnd >= userStart && popupStart <= userEnd;
  });

  return filtered;
}

// ──────────────────────────────
// 5️⃣ Gemini로 추천 요약 생성
// ──────────────────────────────
export async function summarizePopups(popups, region, startDate, endDate) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const popupText = popups
    .map((p) => `• ${p.name} (${p.period}, ${p.location})`)
    .join("\n");

  const prompt = `
너는 여행 큐레이터야.
사용자는 ${region}에 ${startDate.toLocaleDateString()}~${endDate.toLocaleDateString()} 여행을 가.
아래는 DB에서 찾은 팝업 목록이야:
${popupText}

이 중에서 흥미로운 팝업 3개를 간단히 추천해줘.
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
