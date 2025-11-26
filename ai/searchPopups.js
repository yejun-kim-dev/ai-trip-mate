import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import * as chrono from "chrono-node";
import { createClient } from "@supabase/supabase-js";
import { getGeminiResponse } from "./api/gemini.js";

// ✅ 유저 메모리 불러오기 추가
import { getUserMemory } from "./chains/getUserMemory.js";

// ESM 환경에서 __dirname 만들기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 루트 .env 로드 (ai → AI_TRIPMATE)
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

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

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

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
    endDate.setDate(endDate.getDate() + 3);
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
// Supabase 연결
// ==============================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ==============================
// 팝업 검색
// ==============================
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

    return popupEnd >= userStart && popupStart <= userEnd;
  });
}

// ==============================
// Gemini 요약 생성 (유저 메모리 기반 개인화)
// ==============================
export async function summarizePopups(
  popups,
  region,
  startDate,
  endDate,
  userId = "user001" // ✅ userId를 받아서 처리
) {
  // ✅ 유저 메모리 DB에서 불러오기
  const memoryData = await getUserMemory(userId);

  const userMemoryText =
    memoryData.length > 0
      ? memoryData
          .map(
            (m) =>
              `- 지역:${m.region}, 카테고리:${m.category}, 키워드:${m.keyword}, 횟수:${m.count}`
          )
          .join("\n")
      : "과거 여행 데이터가 아직 충분하지 않습니다.";

  const list = popups
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} / 지역:${p.location} / 기간:${
          p.period
        } / 카테고리:${p.category}`
    )
    .join("\n");

  const prompt = `
너는 사용자 맞춤 여행 추천 AI야.

[사용자 이전 기록]
${userMemoryText}

[현재 여행 요청]
- 지역: ${region}
- 기간: ${startDate?.toLocaleDateString()} ~ ${endDate?.toLocaleDateString()}

[현재 조회된 팝업 리스트]
${list}

요청 조건:
1. 사용자의 과거 기록(지역/키워드/카테고리/빈도)을 적극 반영
2. 같은 지역/기간이라도 사용자 성향 따라 다른 추천
3. 말투는 정중한 존댓말
4. 팝업 목록 나열 금지
5. 4줄 이내 추천 멘트만 작성

추천 멘트를 작성해줘.
`;

  return await getGeminiResponse(prompt);
}
