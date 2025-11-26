// ai/chains/retrievalChain.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004",
});

// =====================================
// 🔍 LangChain + 기본 문자열 필터 기반 검색
// =====================================
export async function runRetrievalChain(query, userMemoryText = "") {
  console.log("🤖 [LangChain] 검색 실행:", query);

  // 1) Supabase 전체 팝업 가져오기
  const { data, error } = await supabase
    .from("popups")
    .select("*")
    .limit(1000);

  if (error) {
    console.error("❌ Supabase 오류:", error);
    return [];
  }

  if (!data) return [];

  // 2) null-safe 문자열 필터링
  const results = data.filter((p) => {
    const name = p.name || "";
    const location = p.location || "";
    const category = p.category || "";

    return (
      name.includes(query) ||
      location.includes(query) ||
      category.includes(query)
    );
  });

  console.log("➡ popups 결과:", results.length);

  return results;
}

// =====================================
// 🔍 키워드 기반 이벤트 검색 (conversationChain용)
// =====================================
export async function searchEventInfo({ keywords = [] }) {
  console.log("🔍 [searchEventInfo] 키워드:", keywords);

  // 1) Supabase 전체 팝업 가져오기
  const { data, error } = await supabase
    .from("popups")
    .select("*")
    .limit(100);

  if (error) {
    console.error("❌ Supabase 오류:", error);
    return [];
  }

  if (!data) return [];

  // 2) 키워드 기반 필터링
  const results = data.filter((p) => {
    const name = (p.name || "").toLowerCase();
    const location = (p.location || "").toLowerCase();
    const category = (p.category || "").toLowerCase();

    return keywords.some((keyword) => {
      const lowerKeyword = keyword.toLowerCase();
      return (
        name.includes(lowerKeyword) ||
        location.includes(lowerKeyword) ||
        category.includes(lowerKeyword)
      );
    });
  });

  console.log("➡ searchEventInfo 결과:", results.length);
  return results.slice(0, 10); // 최대 10개만 반환
}