import express from "express";
import { getGeminiResponse } from "./gemini.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "메시지가 없습니다." });

    // Gemini 호출
    const aiReply = await getGeminiResponse(message);
    res.json({ reply: aiReply });
  } catch (err) {
    console.error("❌ chat.js 오류:", err);
    res.status(500).json({ error: "AI 응답 생성 중 오류" });
  }
});

export default router;
