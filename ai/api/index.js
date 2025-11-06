import express from "express";
import chatRouter from "./chat.js";

const router = express.Router();
router.use("/chat", chatRouter);

export default router;
