// utils/repairShared.js
import axios from "axios";
import * as cheerio from "cheerio";
// ==============================
// 1) 네이버 블로그 본문 로딩
// ==============================
export async function loadNaverBlogText(url) {
  if (!url) return null;

  try {
    const html = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000,
    });

    const $ = cheerio.load(html.data);

    // 구형 에디터 (iframe)
    const iframe = $("iframe#mainFrame").attr("src");
    if (iframe) {
      const real = "https://blog.naver.com" + iframe;
      const h2 = await axios.get(real, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const $$ = cheerio.load(h2.data);
      return $$("body").text().replace(/\s+/g, " ");
    }

    // 신형 에디터
    return $("body").text().replace(/\s+/g, " ");
  } catch {
    return null;
  }
}

// ==============================
// 2) 기간 패턴들
// ==============================
const PERIOD_PATTERNS = [
  // 2025.02.11 ~ 2025.02.19
  /(\d{4}[./-]\d{1,2}[./-]\d{1,2})\s*[~\-–]\s*(\d{4}[./-]\d{1,2}[./-]\d{1,2})/,

  // 11.22 ~ 11.29
  /(\d{1,2}[./-]\d{1,2})\s*[~\-–]\s*(\d{1,2}[./-]\d{1,2})/,

  // 11월 22일 ~ 11월 29일
  /(\d{1,2}월\s*\d{1,2}일)\s*[~\-–]\s*(\d{1,2}월\s*\d{1,2}일)/,

  // 11월 22일 ~ 29일
  /(\d{1,2}월\s*\d{1,2}일)\s*[~\-–]\s*(\d{1,2})일/,

  // 2.11(화) ~ 2.19(수)
  /(\d{1,2}[./-]\d{1,2})\s*\([^)]*\)\s*[~\-–]\s*(\d{1,2}[./-]\d{1,2})\s*\([^)]*\)/,

  // 2월 11일(화) ~ 19일(수)
  /(\d{1,2}월\s*\d{1,2}일)\s*\([^)]*\)\s*[~\-–]\s*(\d{1,2})일/,
];

// ==============================
// 3) 기간 raw 문자열 추출
// ==============================
export function extractRawPeriod(text) {
  if (!text) return [null, null];

  for (const pattern of PERIOD_PATTERNS) {
    const m = text.match(pattern);
    if (m) return [m[1], m[2]];
  }

  return [null, null];
}

function normalizeFullDate(str) {
  return str.replace(/[./]/g, "-");
}

function normalizeKoreanDate(str) {
  const nowYear = new Date().getFullYear();
  const m = str.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (!m) return null;

  return `${nowYear}-${String(m[1]).padStart(2, "0")}-${String(m[2]).padStart(
    2,
    "0"
  )}`;
}

function normalizeShortDate(str) {
  const nowYear = new Date().getFullYear();
  const [a, b] = str.replace(/[./]/g, "-").split("-");
  return `${nowYear}-${String(a).padStart(2, "0")}-${String(b).padStart(
    2,
    "0"
  )}`;
}

function finalizePeriod(start, end) {
  // 🔥 여기서 거꾸로 된 기간 자동 뒤집기
  const d1 = new Date(start);
  const d2 = new Date(end);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return `${start} ~ ${end}`;
  }
  if (d1 > d2) {
    return `${end} ~ ${start}`;
  }
  return `${start} ~ ${end}`;
}

// ==============================
// 4) 최종 period 문자열 만들기
// ==============================
export function buildPeriod(startRaw, endRaw) {
  if (!startRaw || !endRaw) return null;

  // 1) YYYY-MM-DD 형태
  if (startRaw.match(/\d{4}[./-]\d{1,2}[./-]\d{1,2}/)) {
    const s = normalizeFullDate(startRaw);
    const e = normalizeFullDate(endRaw);
    return finalizePeriod(s, e);
  }

  // 2) MM월 DD일
  if (startRaw.includes("월")) {
    const s = normalizeKoreanDate(startRaw);
    let e;

    // “11월 22일 ~ 29일” 형태
    if (endRaw.match(/^\d{1,2}일$/)) {
      const m = startRaw.match(/(\d{1,2})월/);
      const month = m ? m[1] : null;
      const day = endRaw.replace("일", "");
      e = `${new Date().getFullYear()}-${String(month).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
    } else {
      e = normalizeKoreanDate(endRaw);
    }

    if (!s || !e) return null;
    return finalizePeriod(s, e);
  }

  // 3) MM.DD / MM-DD / MM/DD
  if (startRaw.match(/^\d{1,2}[./-]\d{1,2}$/)) {
    const s = normalizeShortDate(startRaw);
    const e = normalizeShortDate(endRaw);
    return finalizePeriod(s, e);
  }

  return null;
}

// ==============================
// 5) 운영시간 추출
// ==============================
export function extractHours(text) {
  if (!text) return null;

  const patterns = [
    /\d{1,2}:\d{2}\s*[~\-]\s*\d{1,2}:\d{2}/, // 10:00~20:00
    /\d{1,2}\s*시\s*[~\-]\s*\d{1,2}\s*시/, // 11시~19시
    /(영업시간|운영시간)[^0-9]*(\d{1,2}[:시]\d{0,2}).*?(\d{1,2}[:시]\d{0,2})/,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0];
  }

  return null;
}
