// ai/chains/saveUserMemory.js
import supabase from "./supabaseClient.js";

export async function saveUserMemory(userId, region, category, keyword) {
  try {
    const regionText = region || "전체";

    const insertData = {
      user_id: userId,
      region: regionText,
      category,
      keyword,
      requested_at: new Date().toISOString(), // 요청 시간 기록
    };

    // 매번 새로 insert (count 없이)
    const { data, error } = await supabase
      .from("user_memory")
      .insert([insertData]);

    if (error) {
      console.error("❌ Supabase insert 오류:", error);
    } else {
      console.log("✅ 사용자 요청 기록 저장:", data);
    }
  } catch (e) {
    console.error("❌ saveUserMemory 오류:", e);
  }
}
