// =======================================
// server.js (FINAL CLEAN VERSION)
// =======================================

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

// 🔥 올바른 경로로 수정됨
import searchRoute from "./searchRoute.js";
import apiRouter from "./api/index.js";
import { optimizeRoute } from "./api/optimizeRoute.js";
import kakaoRoute from "./api/kakaoRoute.js";
import tripOptimizerRoute from "./tripOptimizerRoute.js";

import { addTripItem } from "./api/addTripItem.js";

// 크롤러 및 데이터 수집 util
import { fetchNaverNewsPopups } from "../utils/fetchNaverNewsPopups.js";
import { fetchNaverBlogPopups } from "../utils/fetchNaverBlogPopups.js";
import { fetchKCISAEvents } from "../utils/fetchKCISA.js";
import { fetchKCISASpecial } from "../utils/fetchKCISASpecial.js";

// 지역별 행사
import { fetchDaeguEvents } from "./data/fetchDaeguEvents.js";

// 엑셀 기반 축제 데이터
import { parseFestivalExcel } from "./data/parseFestivalExcel.js";
// =======================================
// Express App
// =======================================
const app = express();app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
const PORT = process.env.PORT || 8000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =======================================
// 1) 일정 아이템 추가
// =======================================
app.post("/api/add-trip-item", addTripItem);

// =======================================
// 2) 단일 날 최적 경로
// =======================================
app.post("/api/optimize-route", optimizeRoute);

// =======================================
// 3) 다중 일정 최적화
// =======================================
app.use("/api/trip", tripOptimizerRoute);

// =======================================
// 4) Kakao API
// =======================================
app.use("/api/kakao", kakaoRoute);
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

  // ==============================
// 🚀 여행 생성 API (새로 추가해야 하는 부분)
// ==============================
app.post("/api/trip/create", async (req, res) => {
  try {
    const { userId, country, city, startDate, endDate, companions } = req.body;

    const trip = {
      id: Date.now(),
      userId,
      country,
      city,
      dateRange: {
        start: startDate,
        end: endDate,
        text: `${startDate} ~ ${endDate}`
      },
      companions,
      created_at: new Date().toISOString(),
    };

    return res.json({
      ok: true,
      trip,
    });
  } catch (err) {
    console.error("❌ trip create error:", err);
    res.status(500).json({ error: "여행 생성 실패" });
  }
});


// =======================================
// 7) 데이터 제공 API
// =======================================
app.get("/api/events-data", async (req, res) => {
  try {
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "오류" });
  }
});


// =======================================
// 🔥 8) 자동 크롤링 + 자동 업데이트
// =======================================
const festivalList = parseFestivalExcel();

function filterFutureEvents(list) {
  return list; // TODO: 개선 예정
}

async function savePopupsToDB(data) {
  const unique = Array.from(
    new Map(data.map((p) => [p.url, p])).values()
  ).map((p) => ({
    ...p,
    updated_at: new Date().toISOString(),
  }));

  console.log(`📦 DB 저장 시작 — 총 ${unique.length}개`);

  const { error } = await supabase.from("popups").upsert(unique, {
    onConflict: "url",
  });

  if (error) console.error("❌ Supabase 저장 실패:", error.message);
  else console.log("✅ Supabase 저장 완료");
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

    console.log(`📡 총 크롤링 데이터: ${all.length}`);

    const filtered = filterFutureEvents(all);

    await savePopupsToDB(filtered);
  } catch (err) {
    console.error("🚨 자동 업데이트 오류:", err.message);
  } finally {
    isUpdating = false;
    console.log("⏳ 자동 업데이트 종료");
  }
}


// =======================================
// 🔥 9) 추천 API (챗봇)
// =======================================
app.use("/api", searchRoute);

// Chat + Memory
app.use("/api", apiRouter);


// =======================================
// 10) 일정 자동 정렬
// =======================================
app.post("/api/sort-trip", (req, res) => {
  try {
    const { schedule, totalDays } = req.body;

    if (!schedule || !totalDays) {
      return res.status(400).json({
        error: "schedule과 totalDays는 필수입니다.",
      });
    }

    const sorted = autoSortSchedule(schedule, totalDays);
    res.json({ message: "정렬 완료!", sortedSchedule: sorted });
  } catch (err) {
    res.status(500).json({ error: "정렬 실패" });
  }
});


// =======================================
// 11) 서버 시작
// =======================================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 /api/chat ready`);
  console.log(
    `🔑 Gemini Key: ${process.env.GEMINI_API_KEY ? "OK" : "X"}`
  );

  // 🔥 서버 시작 시 즉시 크롤링 1회 실행
  autoUpdatePopups();

  // 🔥 10분마다 크롤링 자동 반복
  setInterval(autoUpdatePopups, 10 * 60 * 1000);
});


// =======================================
// 12) 예외 처리
// =======================================
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});