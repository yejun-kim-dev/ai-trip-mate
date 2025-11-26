// server.js
import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import express from "express";
import searchRoute from "./ai/searchRoute.js";
import cors from "cors";

// 수집 유틸 import
import { fetchNaverNewsPopups } from "./utils/fetchNaverNewsPopups.js";
import kakaoRoute from "./ai/api/kakaoRoute.js";

import { fetchNaverBlogPopups } from "./utils/fetchNaverBlogPopups.js";
import { parseFestivalExcel } from "./ai/data/parseFestivalExcel.js";
import { fetchKCISAEvents } from "./utils/fetchKCISA.js";
import { fetchKCISASpecial } from "./utils/fetchKCISASpecial.js";
import { fetchDaeguEvents } from "./ai/data/fetchDaeguEvents.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
app.use(cors());
app.use("/api/kakao", kakaoRoute);
app.use(express.json());
const PORT = process.env.PORT || 1000;

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
import https from "https";
import axios from "axios";

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
  const unique = Array.from(new Map(data.map((p) => [p.url, p])).values());
  const { error } = await supabase.from("popups").upsert(unique);
  if (error) console.error("❌ Supabase 저장 실패:", error.message);
}

let isUpdating = false;
async function autoUpdatePopups() {
  if (isUpdating) return;
  isUpdating = true;

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

    const futureOnly = filterFutureEvents(all);
    await savePopupsToDB(futureOnly);
  } catch (err) {
    console.error("🚨 자동 업데이트 오류:", err.message);
  } finally {
    isUpdating = false;
  }
}

// ==============================
// 7) 🔥 추천 API 라우트 연결!
// ==============================
app.use("/api", searchRoute);

// ==============================
// 8) 서버 실행
// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  autoUpdatePopups();
  setInterval(autoUpdatePopups, 10 * 60 * 1000);
});
console.log("✅ Kakao route mounted at /api/kakao");
