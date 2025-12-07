import supabase from "../../chains/supabaseClient.js";
import { UserMemory } from "./memoryModels.js";

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

  // 정규화
  const memory = new UserMemory(userId);

  memory.travelHistory = Array.isArray(data.travel_history)
    ? data.travel_history
    : [];

  memory.preferences = Array.isArray(data.preferences)
    ? data.preferences
    : [];

  memory.intentHistory = Array.isArray(data.intent_history)
    ? data.intent_history
    : [];

  memory.lastUpdated = data.last_updated || null;

  return memory;
}

// 🔥 이 함수가 반드시 존재해야 함
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
    { onConflict: ["user_id"] }
  );

  if (error) console.error("❌ Supabase 저장 오류:", error);
  else console.log("✅ Supabase 저장 완료:", memory.userId);
}
