// ai/api/gemini.js

import dotenv from "dotenv";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export async function getGeminiResponse(prompt) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "⚠️ GCP Gemini API key가 없습니다.";

    // ✔ generateContent에 사용할 실제 모델 (ListModels에서 나온 이름)
    const model = "gemini-2.0-flash";  // 또는 gemini-2.0-pro 등 가능

    // ✔ 올바른 GCP generateContent URL
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
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "(⚠️ 응답 없음)";

    return text;

  } catch (err) {
    console.error("❌ Gemini 호출 오류:", err);
    return "⚠️ AI 응답 처리 중 오류가 발생했습니다.";
  }
}
