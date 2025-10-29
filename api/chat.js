import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    // ✅ POST 이외는 거절
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ✅ body 파싱 (Vercel이 문자열로 보낼 때 대비)
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const message = body?.message;

    if (!message) {
      return res.status(400).json({ reply: "⚠️ message가 비어 있어요." });
    }

    // ✅ 환경변수 체크
    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ Missing GEMINI_API_KEY in environment variables");
      return res.status(500).json({ reply: "서버 환경변수가 없습니다." });
    }

    console.log("✅ Gemini API Key loaded successfully");

    // ✅ Gemini 연결
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log("🔹 User message:", message);

    // ✅ Gemini 호출
    const result = await model.generateContent([
      { role: "user", parts: [{ text: `여행 도우미처럼 답해줘: ${message}` }] },
    ]);

    const reply = result?.response?.text() || "⚠️ 빈 응답입니다.";

    console.log("💬 Gemini reply:", reply);

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    return res.status(500).json({
      reply: "⚠️ 서버 내부 오류가 발생했어요. 다시 시도해주세요.",
      error: error.message || error,
    });
  }
}
