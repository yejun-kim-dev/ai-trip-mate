// utils/savePopups.js
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function savePopupsToDB(popupList) {
  if (!popupList?.length) {
    console.log("⚠️ 저장할 팝업 없음");
    return false;
  }

  // ✅ 스키마 정리 + 빈 값 처리
  const cleaned = popupList
    .map((p) => ({
      category: p.category || "팝업",
      name: p.name || null,
      location: p.location || "전국",
      period: p.period || null,
      hours: p.hours || null,
      source: p.source || "네이버뉴스",
      url: p.url || null,
    }))
    .filter((p) => !!p.url); // url 없는 행 제외

  // ✅ 배열 내부 중복 제거 (url 기준)
  const unique = Array.from(new Map(cleaned.map((p) => [p.url, p])).values());

  // ✅ Supabase Upsert: url 중복 시 update
  const { error } = await supabase.from("popups").upsert(unique, {
    onConflict: "url",
    ignoreDuplicates: false,
  });

  if (error) {
    console.error("❌ DB 저장 실패:", error.message);
    return false;
  }

  console.log(`✅ DB 저장 완료 (중복 제거 후): ${unique.length}개`);
  return true;
}
