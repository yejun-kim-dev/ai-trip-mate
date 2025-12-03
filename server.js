// server.js
import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import { optimizeRoute } from "./ai/api/optimizeRoute.js";
import express from "express";
import searchRoute from "./ai/searchRoute.js";
import apiRouter from "./ai/api/index.js";
import cors from "cors";
import https from "https";
import { addTripItem } from "./ai/api/addTripItem.js";

import axios from "axios";

// 수집 유틸 import
import { fetchNaverNewsPopups } from "./utils/fetchNaverNewsPopups.js";
import kakaoRoute from "./ai/api/kakaoRoute.js";
import tripOptimizerRoute from "./ai/tripOptimizerRoute.js";
import { fetchNaverBlogPopups } from "./utils/fetchNaverBlogPopups.js";
import { parseFestivalExcel } from "./ai/data/parseFestivalExcel.js";
import { optimizeMultipleDays } from "./ai/services/tripService.js";
import { fetchKCISAEvents } from "./utils/fetchKCISA.js";
import { fetchKCISASpecial } from "./utils/fetchKCISASpecial.js";
import { fetchDaeguEvents } from "./ai/data/fetchDaeguEvents.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.post("/api/add-trip-item", addTripItem);

app.post("/api/optimize-route", optimizeRoute);

app.use("/api/trip", tripOptimizerRoute);
const PORT = process.env.PORT || 8000;
app.use("/api/kakao", kakaoRoute);

// ==============================
// 2) 데이터 제공 API
// ==============================
app.get("/api/events-data", async (req, res) => {
  try {
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "오류" });
  }
});

// ==============================
// 4) 국가 리스트 API
// ==============================
app.get("/api/countries", async (req, res) => {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });

    const response = await axios.get(
      "https://restcountries.com/v3.1/all?fields=translations,cca2,flags",
      { httpsAgent: agent }
    );

    let countries = response.data.map((c) => ({
      name: c.translations?.kor?.common || "이름 없음",
      code: c.cca2,
      flag: c.flags?.svg || "",
    }));

    countries.sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));

    res.json(countries);
  } catch (err) {
    res.status(500).json({ error: "국가 데이터 실패" });
  }
});

// ==============================
// 5) 도시 리스트 API
// ==============================
app.get("/api/cities", (req, res) => {
  res.json({ ok: true });
});

// ==============================
// 🟡 자동 업데이트 기능
// ==============================
const festivalList = parseFestivalExcel();

function filterFutureEvents(list) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return list;
}

async function savePopupsToDB(data) {
  // 🔹 url 기준 중복 제거 + updated_at 추가
  const unique = Array.from(new Map(data.map((p) => [p.url, p])).values()).map(
    (p) => ({
      ...p,
      updated_at: new Date().toISOString(), // 🔥 업데이트 날짜 기록
    })
  );

  console.log(`📦 DB 저장 시작 — 총 ${unique.length}개 아이템`);

  const { error } = await supabase.from("popups").upsert(unique, {
    onConflict: "url", // 🔥 중복 url은 update
  });

  if (error) {
    console.error("❌ Supabase 저장 실패:", error.message);
  } else {
    console.log("✅ Supabase 저장 완료");
  }
}

let isUpdating = false;
async function autoUpdatePopups() {
  if (isUpdating) return;
  isUpdating = true;

  console.log("⏰ 자동 업데이트 실행!");

  try {
    const [news, blog, kcisa, special, daegu] = await Promise.allSettled([
      fetchNaverNewsPopups(),
      fetchNaverBlogPopups(),
      fetchKCISAEvents(),
      fetchKCISASpecial(),
      fetchDaeguEvents(),
    ]);

    let all = [
      ...(news.value || []),
      ...(blog.value || []),
      ...(kcisa.value || []),
      ...(special.value || []),
      ...(daegu.value || []),
      ...festivalList,
    ];

    console.log(`📡 수집된 전체 데이터 수: ${all.length}`);

    const futureOnly = filterFutureEvents(all);

    await savePopupsToDB(futureOnly);
  } catch (err) {
    console.error("🚨 자동 업데이트 오류:", err.message);
  } finally {
    console.log("⏳ 자동 업데이트 종료");
    isUpdating = false;
  }
}

// ==============================
// 7) 🔥 추천 API 라우트 연결!
// ==============================
app.use("/api", searchRoute);

// ==============================
// 8) 🔥 RAG LangChain 채팅 API 연결
// ==============================
app.use("/api", apiRouter);

// ==============================
// 9) 서버 실행
// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 API 엔드포인트: http://localhost:${PORT}/api/chat`);
  console.log(
    `🔑 Gemini Key: ${process.env.GEMINI_API_KEY ? "✅ 설정됨" : "❌ 없음"}`
  );
  console.log(
    `🗄️ Supabase URL: ${process.env.SUPABASE_URL ? "✅ 설정됨" : "❌ 없음"}`
  );
  autoUpdatePopups();
  setInterval(autoUpdatePopups, 10 * 60 * 1000);
});

app.post("/api/optimize-trip", async (req, res) => {
  const { userId, dates } = req.body;

  try {
    const results = await optimizeMultipleDays(userId, dates);

    res.json({
      ok: true,
      message: "✅ 선택 날짜 최적화 완료",
      results,
    });
  } catch (err) {
    console.error("최적화 실패:", err);
    res.status(500).json({ error: err.message });
  }
});

// 에러 핸들링
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});
console.log("✅ Kakao route mounted at /api/kakao");
