// utils/fixCorruptedPopups.js
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ==============================
// Supabase 연결
// ==============================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log("🔧 잘못 저장된 팝업 데이터 자동 수리 시작합니다...");

// ==============================
// 기간 뒤집힌 것 보정
// ==============================
function fixPeriod(period) {
  if (!period) return null;

  const match = period.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
  if (!match) return period;

  const start = new Date(match[1]);
  const end = new Date(match[2]);

  if (start > end) {
    // 뒤집기
    return `${match[2]} ~ ${match[1]}`;
  }
  return period;
}

// ==============================
// location 문자열 정화
// ==============================
function cleanLocation(text) {
  if (!text) return "전국";

  const bad = [
    "상세한 안내를 받고 싶으신 경우",
    "네이버",
    "문의",
    "안내",
    "신청",
    "받고 싶은",
    "연락",
    "확인",
  ];

  for (const b of bad) {
    if (text.includes(b)) return "전국";
  }

  // 너무 긴 문자열은 잘못된 값
  if (text.length > 20) return "전국";

  return text;
}

// ==============================
// 전체 수행
// ==============================
async function run() {
  console.log("📦 DB 읽는 중...");

  const { data, error } = await supabase
    .from("popups")
    .select("id, period, location");

  if (error) {
    console.error("❌ DB fetch 실패:", error.message);
    return;
  }

  console.log(`🔍 총 ${data.length}개 항목 검사 시작...`);

  for (const row of data) {
    const newPeriod = fixPeriod(row.period);
    const newLocation = cleanLocation(row.location);

    // 둘 다 변화 없으면 스킵
    if (newPeriod === row.period && newLocation === row.location) continue;

    const { error: updateErr } = await supabase
      .from("popups")
      .update({ period: newPeriod, location: newLocation })
      .eq("id", row.id);

    if (updateErr) {
      console.error(`❌ UPDATE 실패 id=${row.id}:`, updateErr.message);
    } else {
      console.log(`✅ UPDATE 완료 id=${row.id}`);
    }
  }

  console.log("🎉 전체 수리 완료!!");
}

run();
