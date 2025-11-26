// ai/chains/memoryChain.js
import dotenv from "dotenv";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { MemorySaver } from "@langchain/langgraph";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Supabase 연결
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// 사용자 메모리 불러오기
export async function loadUserMemory(userId) {
  const { data } = await client
    .from("user_memory")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return {
      preferences: [],
      intent_history: [],
      travel_history: [],
    };
  }

  return data;
}

// 사용자 검색 내용을 기억에 저장 (업데이트)
export async function saveUserIntent(
  userId,
  message,
  region,
  startDate,
  endDate
) {
  const prev = await loadUserMemory(userId);

  const updatedIntent = [...(prev.intent_history || []), message].slice(-20);

  const updatedTravel = [
    ...(prev.travel_history || []),
    {
      message,
      region,
      startDate,
      endDate,
      created_at: new Date().toISOString(),
    },
  ].slice(-50);

  await client.from("user_memory").upsert({
    user_id: userId,
    intent_history: updatedIntent,
    travel_history: updatedTravel,
    preferences: prev.preferences || [],
  });

  console.log("🧠 사용자 메모리 업데이트 완료");
}

// LangChain용 메모리 객체
export function createChatMemory() {
  return new MemorySaver();
}
