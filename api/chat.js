// api/chat.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    // ✅ POST 요청만 허용
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ✅ 본문 파싱
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const userMessage = body.message;

    if (!userMessage) {
      return res.status(400).json({ error: "메시지가 비어 있습니다." });
    }

    // ✅ Gemini 연결
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(userMessage);

    const reply = result.response?.text() || "⚠️ Gemini로부터 응답이 없습니다.";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
