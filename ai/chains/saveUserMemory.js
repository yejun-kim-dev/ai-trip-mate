import supabase from "./supabaseClient.js";

export async function saveUserMemory(userId, region, category, keyword) {
  try {
    const regionText = region || "전체";

    const { data: existing, error } = await supabase
      .from("user_memory")
      .select("*")
      .eq("user_id", userId)
      .eq("category", category)
      .eq("keyword", keyword)
      .eq("region", regionText);

    if (error) {
      console.error("❌ Supabase select 오류:", error);
      return;
    }

    if (existing && existing.length > 0) {
      const old = existing[0];

      const { error: updateError } = await supabase
        .from("user_memory")
        .update({ count: old.count + 1 })
        .eq("id", old.id);

      if (updateError) {
        console.error("❌ update 실패:", updateError);
      } else {
        console.log("🔄 사용자 메모리 count 증가 완료");
      }
    } else {
      const { error: insertError } = await supabase.from("user_memory").insert([
        {
          user_id: userId,
          category,
          keyword,
          region: regionText,
          count: 1,
        },
      ]);

      if (insertError) {
        console.error("❌ insert 실패:", insertError);
      } else {
        console.log("✅ 사용자 메모리 새로 저장 완료");
      }
    }
  } catch (e) {
    console.error("❌ saveUserMemory 예외:", e);
  }
}
