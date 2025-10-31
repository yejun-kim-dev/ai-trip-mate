import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    // ✅ POST 요청만 허용
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ✅ body 안전하게 파싱
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const message = body?.message;

    if (!message) {
      return res.status(400).json({ reply: "⚠️ message가 비어 있어요." });
    }

    // ✅ 환경변수 확인
    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ Missing GEMINI_API_KEY in environment variables");
      return res.status(500).json({ reply: "서버 환경변수가 없습니다." });
    }

    console.log("✅ Gemini API Key loaded successfully");
    console.log("🔹 User message:", message);

    // ✅ Gemini API 설정
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // ✅ 올바른 JSON 형식 (배열로 전달!)
    const prompt = `너는 여행 도우미야. 사용자의 질문: ${message}`;

    const result = await model.generateContent([
      {
        role: "user", // ✅ role을 명시해야 대화형 구조 유지 가능
        parts: [{ text: prompt }],
      },
    ]);

    // ✅ 결과 텍스트 추출
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
