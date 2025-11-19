// ai/chains/memoryChain.js
import dotenv from "dotenv";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 루트의 .env 불러오기
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { createClient } from "@supabase/supabase-js";
import { MemorySaver } from "@langchain/langgraph";

// 🔥 기존 SUPABASE_KEY → 네 프로젝트 기준 SUPABASE_SERVICE_KEY 로 변경
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// 디버그 로그
console.log("ENV SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("ENV SUPABASE_SERVICE_KEY exist?:", !!process.env.SUPABASE_SERVICE_KEY);

export async function loadUserMemory(userId) {
  const { data } = await client
    .from("user_memory")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return "사용자 기억 없음";

  const prefs = data.preferences?.join(", ") || "";
  const intents = data.intent_history?.join(", ") || "";
  const travel = JSON.stringify(data.travel_history || [], null, 2);

  return `
[선호도]
${prefs}

[이전 의도]
${intents}

[여행 기록]
${travel}
`;
}

export function createChatMemory() {
  return new MemorySaver();
}
