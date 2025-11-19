// ai/api/gemini.js

import dotenv from "dotenv";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✔ 프로젝트 루트의 .env를 정확하게 읽도록 설정
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export async function getGeminiResponse(prompt) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "⚠️ GCP Gemini API key가 없습니다.";

    // ✔ ListModels에서 확인된 실제 사용 가능한 모델
    const model = "gemini-2.0-flash";

    // ✔ GCP Vertex 아닌 일반 GCP generateContent endpoint!
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 500,
        topP: 0.8,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    console.log("📩 Gemini Raw Response:", JSON.stringify(data, null, 2));

    if (data.error) {
      console.error("❌ Gemini Error:", data.error);
      return `⚠️ Gemini 오류: ${data.error.message}`;
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "(⚠️ 응답 없음)";

    return text;
  } catch (err) {
    console.error("❌ Gemini 호출 오류:", err);
    return "⚠️ AI 응답 처리 중 오류가 발생했습니다.";
  }
}
