import express from "express";
import chatRouter from "./chat.js";
import langchainChatRouter from "./langchainChat.js";

const router = express.Router();

// 기존 Gemini 채팅 API
router.use("/chat", chatRouter);

// LangChain 기반 채팅 API
router.use("/langchain-chat", langchainChatRouter);

export default router;
