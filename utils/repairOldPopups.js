// utils/repairOldPopups.js
// 📌 기존 popups 데이터의 name / period / hours / location을
//    cleanName + blog re-crawling으로 싹 정제하는 FULL REPAIR 스크립트

import "dotenv/config";
import axios from "axios";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

import { cleanName } from "./cleanName.js";
import { extractPlaceName } from "./locationExtractor.js";

// ==============================
// 0) Supabase 연결
// ==============================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log("\n🔧 [FULL] name + 기간 + 위치 + 운영시간 정제 시작...\n");

// ==============================
// 1) 날짜 파싱 유틸
// ==============================

const PERIOD_PATTERNS = [
  /(\d{4}[./-]\d{1,2}[./-]\d{1,2})\s*[~\-–]\s*(\d{4}[./-]\d{1,2}[./-]\d{1,2})/,
  /(\d{2}[./-]\d{1,2}[./-]\d{1,2})\s*[~\-–]\s*(\d{2}[./-]\d{1,2}[./-]\d{1,2})/,
  /(\d{1,2}[./-]\d{1,2})\s*[~\-–]\s*(\d{1,2}[./-]\d{1,2})/,
  /(\d{1,2}\/\d{1,2})\s*[~\-–]\s*(\d{1,2}\/\d{1,2})/,
  /(\d{1,2}월\s*\d{1,2}일)\s*[~\-–]\s*(\d{1,2}월\s*\d{1,2}일)/,
  /(\d{1,2}월\s*\d{1,2}일)\s*[~\-–]\s*(\d{1,2})일/,
  /(\d{1,2}[./-]\d{1,2})\s*\([^)]*\)\s*[~\-–]\s*(\d{1,2}[./-]\d{1,2})\s*\([^)]*\)/,
  /(\d{1,2}월\s*\d{1,2}일)\s*\([^)]*\)\s*[~\-–]\s*(\d{1,2})일/,
];

function extractRawPeriod(text) {
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

function orderPeriod(s, e) {
  const start = new Date(s);
  const end = new Date(e);
  if (!isNaN(start) && !isNaN(end) && start > end) {
    return `${e} ~ ${s}`;
  }
  return `${s} ~ ${e}`;
}

function buildPeriod(startRaw, endRaw) {
  if (!startRaw || !endRaw) return null;

  if (startRaw.match(/\d{4}[./-]\d{1,2}[./-]\d{1,2}/)) {
    const s = normalizeFullDate(startRaw);
    const e = normalizeFullDate(endRaw);
    return orderPeriod(s, e);
  }

  if (startRaw.includes("월")) {
    const s = normalizeKoreanDate(startRaw);
    let e;

    if (endRaw.match(/^\d{1,2}일$/)) {
      const mm = startRaw.match(/(\d{1,2})월/)[1];
      const dd = endRaw.replace("일", "");
      e = `${new Date().getFullYear()}-${mm.padStart(2, "0")}-${dd.padStart(
        2,
        "0"
      )}`;
    } else {
      e = normalizeKoreanDate(endRaw);
    }

    return orderPeriod(s, e);
  }

  if (startRaw.match(/^\d{1,2}[./-]\d{1,2}$/)) {
    const s = normalizeShortDate(startRaw);
    const e = normalizeShortDate(endRaw);
    return orderPeriod(s, e);
  }

  return null;
}

// ==============================
// 2) 블로그 본문 로딩
// ==============================
async function loadNaverBlogText(url) {
  try {
    const html = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000,
    });
    const $ = cheerio.load(html.data);

    const iframe = $("iframe#mainFrame").attr("src");
    if (iframe) {
      const real = "https://blog.naver.com" + iframe;
      const h2 = await axios.get(real, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const $$ = cheerio.load(h2.data);
      return $$("body").text().replace(/\s+/g, " ");
    }

    return $("body").text().replace(/\s+/g, " ");
  } catch {
    return null;
  }
}

// ==============================
// 3) 운영시간
// ==============================
function extractHours(text) {
  if (!text) return null;
  const patterns = [
    /\d{1,2}:\d{2}\s*[~\-]\s*\d{1,2}:\d{2}/,
    /\d{1,2}\s*시\s*[~\-]\s*\d{1,2}\s*시/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return null;
}

// ==============================
// 4) DB 읽기
// ==============================
async function fetchAllPopups() {
  const { data, error } = await supabase.from("popups").select("*");

  if (error) {
    console.error("❌ READ ERROR:", error.message);
    process.exit(1);
  }

  return data;
}

// ==============================
// 5) 한 레코드 수리
// ==============================
async function repairOne(row) {
  const {
    id,
    name: oldName,
    url,
    period: oldPeriod,
    hours: oldHours,
    location: oldLoc,
  } = row;

  const newName = cleanName(oldName);

  // 블로그 기반일 때만 본문 재크롤링
  let fullText = null;
  if (url && url.includes("blog.naver.com")) {
    fullText = await loadNaverBlogText(url);
  }

  // 기간
  let finalPeriod = oldPeriod;
  if (fullText) {
    const [rawStart, rawEnd] = extractRawPeriod(fullText);
    const p = rawStart && rawEnd ? buildPeriod(rawStart, rawEnd) : null;
    if (p) finalPeriod = p;
  }

  // 시간
  let finalHours = oldHours;
  if (fullText) {
    const h = extractHours(fullText);
    if (h) finalHours = h;
  }

  // 위치
  let finalLocation = oldLoc;
  if (fullText) {
    const loc = extractPlaceName(fullText);
    if (loc) finalLocation = loc;
  }

  // 변경 사항 없으면 skip
  if (
    newName === oldName &&
    finalPeriod === oldPeriod &&
    finalHours === oldHours &&
    finalLocation === oldLoc
  ) {
    console.log(`⚪ 변경 없음 → skip id=${id}`);
    return;
  }

  const updatePayload = {
    name: newName,
    period: finalPeriod,
    hours: finalHours,
    location: finalLocation,
  };

  const { error } = await supabase
    .from("popups")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    console.error(`❌ UPDATE ERROR id=${id}:`, error.message);
  } else {
    console.log(`✅ UPDATE OK id=${id}`, updatePayload);
  }
}

// ==============================
// 6) 전체 실행
// ==============================
async function run() {
  const rows = await fetchAllPopups();
  console.log(`📦 총 ${rows.length}개 팝업 정제 시작\n`);

  for (const row of rows) {
    await repairOne(row);
  }

  console.log("\n🎉 전체 정제 완료!");
  process.exit(0);
}

run();
