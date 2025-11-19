import express from "express";
import { createConversationChain } from "../chains/conversationChain.js";

const router = express.Router();

router.post("/langchain-chat", async (req, res) => {
  try {
    const { message, userId } = req.body;
    const chain = await createConversationChain(userId);

    const reply = await chain.invoke({ message });

    res.json({ reply });   // ✅ 반드시 이렇게!
  } catch (err) {
    console.error("🔥 LangChain Chat Error:", err);
    res.status(500).json({ error: "LangChain internal error" });
  }
});


export default router;
