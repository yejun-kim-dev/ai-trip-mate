import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const message = body?.message;
    if (!message) {
      return res.status(400).json({ reply: "⚠️ message가 비어 있어요." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ reply: "⚠️ GEMINI_API_KEY가 없습니다." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // ✅ 여기 핵심 수정!
    const prompt = `너는 여행 도우미야. 사용자의 질문: ${message}`;
    const result = await model.generateContent([
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ]);

    const reply = result.response.text() || "⚠️ 빈 응답입니다.";
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    return res.status(500).json({
      reply: "⚠️ 서버 오류가 발생했습니다.",
      error: error.message,
    });
  }
}
