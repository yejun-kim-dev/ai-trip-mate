// ai/api/memory/memoryRepository.js
import supabase from "../../chains/supabaseClient.js";
import { UserMemory } from "./memoryModels.js";

// 사용자 메모리 불러오기
export async function loadMemory(userId) {
  const { data, error } = await supabase
    .from("user_memory")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("❌ Supabase 불러오기 오류:", error);
    throw error;
  }

  if (!data) {
    console.log(`🆕 새 유저 메모리 생성: ${userId}`);
    return new UserMemory(userId);
  }

  return Object.assign(new UserMemory(userId), data);
}

// 사용자 메모리 저장
export async function saveMemory(memory) {
  const { error } = await supabase.from("user_memory").upsert(
    [
      {
        user_id: memory.userId,
        travel_history: memory.travelHistory,
        preferences: memory.preferences,
        intent_history: memory.intentHistory,
        last_updated: new Date(),
      },
    ],
    { onConflict: ["user_id"] } // ✅ 매우 중요!
  );

  if (error) console.error("❌ Supabase 저장 오류:", error);
  else console.log("✅ Supabase 저장 완료:", memory.userId);
}
