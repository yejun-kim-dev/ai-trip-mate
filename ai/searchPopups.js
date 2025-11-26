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
// 사용자 질문 → 지역 + 날짜 추출 (개선된 버전)
// ==============================
export function parseUserQuery(message) {
  // 지역 추출 (더 많은 지역 추가)
  const regionRegex =
    /(서울|잠실|부산|대구|대전|광주|인천|제주|수원|울산|성수|홍대|건대|강남|신촌|해운대|서면|부평|경기|경기도|강원|강원도|충청|충청도|전라|전라도|경상|경상도)/;

  const region = message.match(regionRegex)?.[0] || null;

  let startDate = null;
  let endDate = null;

  // 1️⃣ chrono를 먼저 시도 (가장 정확함)
  // forwardDate: true는 미래 날짜를 우선적으로 인식
  const parsed = chrono.parse(message, new Date(), { forwardDate: true });
  
  if (parsed.length > 0) {
    const firstResult = parsed[0];
    startDate = firstResult.start?.date();
    endDate = firstResult.end?.date() || firstResult.start?.date();
    
    // 연도가 없으면 스마트하게 연도 추론
    if (startDate && !firstResult.start?.get("year")) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const currentDate = new Date().getDate();
      const startMonth = startDate.getMonth() + 1;
      const startDay = startDate.getDate();
      
      // 과거 월이면 무조건 다음 해로 설정
      // 같은 월이어도 오늘 날짜보다 과거면 다음 해로 설정
      if (startMonth < currentMonth || 
          (startMonth === currentMonth && startDay < currentDate)) {
        startDate.setFullYear(currentYear + 1);
        if (endDate) endDate.setFullYear(currentYear + 1);
        console.log(`📅 과거 날짜 감지: ${currentYear + 1}년으로 설정`);
      } else {
        startDate.setFullYear(currentYear);
        if (endDate) endDate.setFullYear(currentYear);
      }
    }
  }
  
  // 1-1️⃣ chrono가 실패했거나 월만 언급된 경우 처리 ("12월에 하는 행사")
  if (!startDate || !endDate) {
    // "12월에", "12월", "12월에 하는" 같은 패턴
    const monthOnlyRegex = /(\d{1,2})월\s*(?:에|에\s*하는|에\s*열리는|에\s*할)/;
    const monthMatch = message.match(monthOnlyRegex);
    
    if (monthMatch) {
      const targetMonth = parseInt(monthMatch[1]);
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      // 목표 연도 결정: 과거 월이면 다음 해, 아니면 올해
      let targetYear = currentYear;
      if (targetMonth < currentMonth) {
        targetYear = currentYear + 1;
        console.log(`📅 월만 언급됨 (${targetMonth}월): ${targetYear}년으로 설정`);
      }
      
      // 해당 월의 첫날과 마지막날로 설정
      startDate = new Date(targetYear, targetMonth - 1, 1);
      endDate = new Date(targetYear, targetMonth, 0); // 다음 달 0일 = 이번 달 마지막 날
      
      console.log(`📅 월만 파싱: ${targetYear}년 ${targetMonth}월 (${startDate.toISOString()} ~ ${endDate.toISOString()})`);
    }
  }

  // 2️⃣ chrono가 실패하면 정규식으로 시도
  if (!startDate || !endDate) {
    // "2025년 12월 1일부터 12월 10일까지" 형식
    const yearMonthDayRegex = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g;
    const found = [...message.matchAll(yearMonthDayRegex)];
    
    if (found.length >= 2) {
      startDate = new Date(`${found[0][1]}-${String(found[0][2]).padStart(2, '0')}-${String(found[0][3]).padStart(2, '0')}`);
      endDate = new Date(`${found[1][1]}-${String(found[1][2]).padStart(2, '0')}-${String(found[1][3]).padStart(2, '0')}`);
    } else if (found.length === 1) {
      const year = found[0][1];
      const month = found[0][2];
      const day = found[0][3];
      startDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      
      // "부터" 다음에 오는 날짜 찾기
      const afterFrom = message.substring(message.indexOf("부터") + 2);
      const endFound = [...afterFrom.matchAll(/(\d{1,2})월\s*(\d{1,2})일/g)];
      if (endFound.length > 0) {
        endDate = new Date(`${year}-${String(endFound[0][1]).padStart(2, '0')}-${String(endFound[0][2]).padStart(2, '0')}`);
      } else {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 3);
      }
    } else {
      // "12월 1일부터 10일까지" 형식 (연도 없음)
      const monthDayRegex = /(\d{1,2})월\s*(\d{1,2})일/g;
      const found = [...message.matchAll(monthDayRegex)];
      
      if (found.length >= 2) {
        const month1 = parseInt(found[0][1]);
        const day1 = parseInt(found[0][2]);
        const month2 = parseInt(found[1][1]);
        const day2 = parseInt(found[1][2]);
        
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        // 첫 번째 날짜의 연도 결정
        let targetYear = currentYear;
        if (month1 < currentMonth || (month1 === currentMonth && day1 < new Date().getDate())) {
          targetYear = currentYear + 1;
        }
        
        startDate = new Date(targetYear, month1 - 1, day1);
        endDate = new Date(targetYear, month2 - 1, day2);
      } else if (found.length === 1) {
        const month = parseInt(found[0][1]);
        const day = parseInt(found[0][2]);
        
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const currentDay = new Date().getDate();
        
        // 연도 결정
        let targetYear = currentYear;
        if (month < currentMonth || (month === currentMonth && day < currentDay)) {
          targetYear = currentYear + 1;
        }
        
        startDate = new Date(targetYear, month - 1, day);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 3);
      }
    }
  }

  console.log("🔍 parseUserQuery 최종 결과:", { 
    region, 
    startDate: startDate?.toISOString(), 
    endDate: endDate?.toISOString() 
  });
  
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
// 팝업 검색 (개선: 해당 연도만 필터링, 오래된 데이터 제외)
// ==============================
export async function fetchPopupsFromDB(region, startDate, endDate) {
  const { data, error } = await supabase
    .from("popups")
    .select("*")
    .ilike("location", `%${region}%`);

  if (error) throw error;

  const userStart = new Date(startDate);
  const userEnd = new Date(endDate);
  const targetYear = userStart.getFullYear();
  const currentYear = new Date().getFullYear();
  
  // 오래된 행사 제외 기준: 2년 이상 전에 시작한 행사는 제외
  const minStartYear = currentYear - 2;

  return data.filter((p) => {
    const [ps, pe] = extractStartEnd(p.period);
    if (!ps || !pe) return false;

    const popupStart = new Date(ps);
    const popupEnd = new Date(pe);
    
    // 1️⃣ 기간이 겹치는지 확인
    const isOverlapping = popupEnd >= userStart && popupStart <= userEnd;
    if (!isOverlapping) return false;
    
    // 2️⃣ 오래된 행사 제외 (2년 이상 전에 시작한 행사)
    const popupStartYear = popupStart.getFullYear();
    if (popupStartYear < minStartYear) {
      return false;
    }
    
    // 3️⃣ 해당 연도에 진행 중인 행사 우선 (해당 연도에 시작했거나 해당 연도에 진행 중)
    // 요청한 기간과 겹치면서, 시작일이 너무 오래되지 않은 행사만 포함
    return true;
  }).sort((a, b) => {
    // 최신순 정렬 (시작일 기준 내림차순)
    const [psA] = extractStartEnd(a.period);
    const [psB] = extractStartEnd(b.period);
    if (!psA || !psB) return 0;
    const dateA = new Date(psA);
    const dateB = new Date(psB);
    return dateB - dateA;
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
  userId = "user001"
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

  function formatKoreanMonthDay(dateString) {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
  }

  const start = formatKoreanMonthDay(startDate);
  const end = formatKoreanMonthDay(endDate);

  const text = `요청하신 ${start}부터 ${end}까지 ${region}의 팝업 리스트입니다.`;

  const prompt = `
아래 문장을 그대로 출력하라.

${text}

⚠ 주의:
- 절대 줄바꿈 문자(\\n)를 포함하지 마라.
- 절대 따옴표를 붙이지 마라.
- 다른 문장 추가 금지.
- 설명 금지.
- 오직 이 한 문장만 출력.
`;

  // ✅ Gemini 호출
  const result = await getGeminiResponse(prompt);

  // ✅ 줄바꿈 제거 + 공백 정리
  const cleanText = result.replace(/\n/g, "").trim();

  return cleanText;
}
