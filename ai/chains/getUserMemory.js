import { supabase } from "./supabaseClient.js";

export async function getUserMemory(userId) {
  console.log("📥 [UserMemory] 불러오기 요청:", userId);

  const { data, error } = await supabase
    .from("user_memory")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("❌ Supabase select 오류:", error);
    return [];
  }

  if (!data || !Array.isArray(data)) {
    console.warn("⚠ 사용자 메모리 없음 또는 비정상:", data);
    return [];
  }

  console.log(`✅ 사용자 메모리 ${data.length}개 불러옴`);
  return data;
}
