import express from "express";
import { extractMemoryConcepts } from "./memoryExtractor.js";
import { updateMemory, loadMemory } from "./memoryUpdater.js";

const router = express.Router();

router.post("/process", (req, res) => {
  const { userId, userMessage } = req.body;
  if (!userId || !userMessage) return res.status(400).json({ error: "userId와 userMessage 필요" });

  const extracted = extractMemoryConcepts(userMessage);
  const updated = updateMemory(userId, extracted);

  res.json({ message: "기억 업데이트 완료", extracted, updatedMemory: updated });
});

router.get("/:userId", (req, res) => {
  const memory = loadMemory(req.params.userId);
  res.json(memory);
});

export default router;
