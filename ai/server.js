// ai/server.js
import express from "express";
import cors from "cors";
import apiRouter from "./api/index.js";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ 모든 API 라우트 연결
app.use("/api", apiRouter);

const PORT = 8000;
app.listen(PORT, () => {
  console.log("🚀 AI TripMate 서버 실행 중: http://localhost:" + PORT);
});
