// ai/chains/llmChain.js
import dotenv from "dotenv";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 루트 .env 로드
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export function createLLM() {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: "models/gemini-2.0-flash",   // ← 여기 기준으로 고정!
  });
}
