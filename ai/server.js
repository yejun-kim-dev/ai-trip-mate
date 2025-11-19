// ai/server.js
import express from "express";
import cors from "cors";
import apiRouter from "./api/index.js";
import dotenv from "dotenv";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

// ✅ 항상 루트 .env 인식
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

// ✅ CORS (필요시 제한 가능)
app.use(cors());
app.use(express.json());

// ✅ API 라우터 연결
app.use("/api", apiRouter);

// ✅ 포트 환경변수로 관리
const PORT = process.env.PORT || 8000;

// ✅ 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 AI TripMate 서버 실행 중: http://localhost:${PORT}`);
  console.log(`🔑 Gemini Key Loaded: ${!!process.env.GEMINI_API_KEY}`);
});

// ✅ 전역 에러 핸들링 (선택)
app.use((err, req, res, next) => {
  console.error("🔥 서버 오류 발생:", err);
  res.status(500).json({ error: "서버 내부 오류 발생" });
});
