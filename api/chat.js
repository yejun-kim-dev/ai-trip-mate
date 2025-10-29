// /api/chat.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // ✅ POST 요청만 허용
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // ✅ JSON body 안전하게 파싱
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const message = body?.message;

    if (!message) {
      return res.status(400).json({ reply: "⚠️ message가 비어 있어요." });
    }

    // ✅ Gemini API 연결
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `너는 여행 일정 추천 도우미야. 사용자의 질문: ${message}`;
    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    return res.status(500).json({
      reply: "⚠️ 서버 오류가 발생했어요. 다시 시도해주세요.",
    });
  }
}
