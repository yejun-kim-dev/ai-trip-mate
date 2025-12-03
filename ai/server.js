// ai/server.js
import express from "express";
import cors from "cors";
import apiRouter from "./api/index.js";
import dotenv from "dotenv";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import axios from 'axios';
import { citiesByCountry } from "../utils/citiesByCountry.js";

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

// 4) 국가 리스트 API
// ============================app.get("/api/countries", async (req, res) => {
  import https from "https";

  app.get("/api/countries", async (req, res) => {
    try {
      const agent = new https.Agent({ rejectUnauthorized: false });
  
      // ✅ 필드 명시해서 요청 (400 차단 우회 핵심)
      const response = await axios.get(
        "https://restcountries.com/v3.1/all?fields=translations,cca2,flags",
        { httpsAgent: agent }
      );
  
      let countries = response.data
        .map((c) => ({
          name: c.translations?.kor?.common || c.translations?.eng?.common || "이름 없음",
        code: c.cca2,
        flag: c.flags?.svg || c.flags?.png || "",
        }))
        .filter((c) => c.code && c.flag);
      // ✅ 가나다순 정렬 (한글 정렬 지원)
      countries.sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));

      // ✅ 대한민국(KR)만 맨 위로 이동
      const korea = countries.find((c) => c.code === "KR");
      if (korea) {
        countries = [korea, ...countries.filter((c) => c.code !== "KR")];
      }
      res.json(countries);
    } catch (err) {
      console.error("❌ /api/countries 오류:", err.message);
      res.status(500).json({ error: "국가 목록 불러오기 실패" });
    }
  });
  
  // ==============================
  // 5) 도시 리스트 API
  // ==============================
  app.get("/api/cities", (req, res) => {
    const countryCode = req.query.country; // 예: KR, JP, US
  
    if (!countryCode) {
      return res
        .status(400)
        .json({ error: "country 쿼리값 필요 (예: ?country=KR)" });
    }
  
    const cities = citiesByCountry[countryCode.toUpperCase()];
  
    if (!cities) {
      return res.status(404).json({ error: "해당 국가의 도시 목록이 없습니다." });
    }
  
    res.json({ country: countryCode.toUpperCase(), cities });
  });
  // ==============================
  // 6) 여행 날짜 캘린더 API
  // ==============================
  app.post("/api/calendar", (req, res) => {
    const { startDate, endDate } = req.body;
  
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate, endDate 필요" });
    }
  
    // 날짜 형식 유효성 확인
    const start = new Date(startDate);
    const end = new Date(endDate);
  
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "유효한 날짜 형식이 아닙니다." });
    }
  
    // ✅ 여행 일 수 계산
    const diffTime = Math.abs(end - start);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
    // ✅ 서버는 일단 날짜 정보를 그대로 반환 (나중에 일정 생성에 사용)
    return res.json({
      startDate,
      endDate,
      durationDays: days,
      message: `여행은 총 ${days}일 입니다.`,
    });
  });
  