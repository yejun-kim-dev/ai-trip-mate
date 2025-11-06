import fetch from "node-fetch";

// 🔹 Gemini API 호출 로직
// 환경 변수 GCP_API_KEY에 Google Cloud Gemini 키 설정 필요
export async function getGeminiResponse(prompt) {
  try {
    const apiKey = process.env.GCP_API_KEY;
    if (!apiKey) return "⚠️ GCP_API_KEY 환경 변수가 없습니다.";

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey;

    const body = { contents: [{ parts: [{ text: prompt }] }] };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "응답을 가져오지 못했습니다.";
  } catch (err) {
    console.error("❌ Gemini 호출 오류:", err);
    return "AI 응답 중 오류가 발생했습니다.";
  }
}
