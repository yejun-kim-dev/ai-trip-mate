// server.js
import dotenv from "dotenv";
dotenv.config();
import { optimizeRoute } from "./ai/api/optimizeRoute.js";
import express from "express";
import searchRoute from "./ai/searchRoute.js";
import apiRouter from "./ai/api/index.js";
import cors from "cors";
import https from "https";
import { addTripItem } from "./ai/api/addTripItem.js";

// 수집 유틸 import

import kakaoRoute from "./ai/api/kakaoRoute.js";
import tripOptimizerRoute from "./ai/tripOptimizerRoute.js";
import { fetchNaverBlogPopups } from "./utils/fetchNaverBlogPopups.js";
import { parseFestivalExcel } from "./ai/data/parseFestivalExcel.js";
import { fetchKCISAEvents } from "./utils/fetchKCISA.js";
import { fetchKCISASpecial } from "./utils/fetchKCISASpecial.js";
import { fetchDaeguEvents } from "./ai/data/fetchDaeguEvents.js"; // ==========================
// 📌 최종 일정 생성 API
// ==========================
import {
  fetchUserTripItems,
  optimizeWithFixedStops,
} from "./ai/services/tripService.js";

// 더미 식당 / 숙소 불러오기
import dummyRestaurants from "./ai/data/dummyRestaurants.js";
import dummyHotels from "./ai/data/dummyHotels.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
import axios from "axios";
import supabase from "./ai/chains/supabaseClient.js";

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;

// 🔹 주소 → 위도/경도 변환
async function geocode(address) {
  try {
    const url = "https://dapi.kakao.com/v2/local/search/address.json";
    const { data } = await axios.get(url, {
      params: { query: address },
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    });

    if (data.documents.length === 0) return null;

    return {
      lat: parseFloat(data.documents[0].y),
      lng: parseFloat(data.documents[0].x),
    };
  } catch (err) {
    console.error("카카오 지오코딩 실패:", err);
    return null;
  }
}
// ==============================
// 📌 여행 일정 불러오기 API
// ==============================
app.post("/api/get-trip-items", async (req, res) => {
  try {
    const { userId, tripId } = req.body;

    if (!userId || !tripId) {
      return res.status(400).json({
        ok: false,
        error: "userId와 tripId는 필수입니다.",
      });
    }

    const { data, error } = await supabase
      .from("user_trip_items")
      .select("*")
      .eq("user_id", userId)
      .eq("trip_id", tripId)
      .order("visit_order", { ascending: true });

    if (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: "DB 조회 실패" });
    }

    return res.json({
      ok: true,
      items: data || [],
    });
  } catch (err) {
    console.error("🔥 get-trip-items 오류:", err);
    return res.status(500).json({
      ok: false,
      error: "서버 오류",
    });
  }
});

app.post("/api/add-trip-items", async (req, res) => {
  try {
    const { user_id, item_ids } = req.body;

    if (!user_id || !item_ids) {
      return res.status(400).json({ error: "user_id와 item_ids 필요." });
    }

    const insertRows = [];

    for (const popupId of item_ids) {
      // 1) popups 테이블에서 주소 가져오기
      const { data: popup } = await supabase
        .from("popups")
        .select("address, name, category")
        .eq("id", popupId)
        .single();

      if (!popup) continue;

      // 2) 주소로 위도/경도 가져오기
      const pos = await geocode(popup.address);

      // 3) user_trip_items에 저장할 구조 생성
      insertRows.push({
        user_id,
        popup_id: popupId,
        popup_name: popup.name,
        category: popup.category || "popup",
        address: popup.address,
        lat: pos?.lat || null,
        lng: pos?.lng || null,
        visit_order: null,
      });
    }

    const { error } = await supabase.from("user_trip_items").insert(insertRows);

    if (error) {
      console.error("DB Insert 실패:", error);
      return res.status(500).json({ error: "DB insert 실패" });
    }

    return res.json({
      ok: true,
      inserted: insertRows.length,
    });
  } catch (err) {
    console.error("🔥 add-trip-items 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

app.post("/api/get-my-trips", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ ok: false, error: "userId 필요" });
    }

    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: true });

    if (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: "DB 조회 실패" });
    }

    return res.json({ ok: true, trips: data || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "서버 오류" });
  }
});

app.use("/api/trip", tripOptimizerRoute);
const PORT = process.env.PORT || 8000;
app.use("/api/kakao", kakaoRoute);

app.post("/api/trip/create", async (req, res) => {
  try {
    const { userId, country, city, startDate, endDate, companions } = req.body;

    const trip = {
      id: Date.now(),
      user_id: userId,
      country,
      city,
      start_date: startDate,
      end_date: endDate,
      companions,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("trips").insert([trip]);

    if (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: "DB 저장 실패" });
    }

    return res.json({
      ok: true,
      trip,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "서버 오류" });
  }
});

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

// ==========================
// 📌 자동 정렬 API 라우트
// ==========================
app.post("/api/sort-trip", (req, res) => {
  try {
    const { schedule, totalDays } = req.body;

    if (!schedule || !totalDays) {
      return res.status(400).json({
        error: "schedule과 totalDays는 필수입니다.",
      });
    }

    const sorted = autoSortSchedule(schedule, totalDays);

    return res.json({
      message: "정렬 완료!",
      sortedSchedule: sorted,
    });
  } catch (err) {
    console.error("정렬 오류:", err);
    return res.status(500).json({ error: "정렬 실패" });
  }
});

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
// ==============================
// 📌 시연용: 2박 3일 일정 자동 분배 엔진
// ==============================

// 에러 핸들링
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});
console.log("✅ Kakao route mounted at /api/kakao");

// ==========================
// 📌 일정 자동 정렬 함수들
// ==========================

// 일정 항목 분류하기
function splitItems(schedule) {
  const restaurants = [];
  const hotels = [];
  const popups = [];

  Object.values(schedule).forEach((dayItems) => {
    dayItems.forEach((item) => {
      if (item.type === "restaurant") restaurants.push(item);
      else if (item.type === "hotel") hotels.push(item);
      else if (item.type === "popup") popups.push(item);
    });
  });

  return { restaurants, hotels, popups };
}

// 날짜 수만큼 빈 틀 생성
function createEmptySchedule(totalDays) {
  const schedule = {};
  for (let i = 1; i <= totalDays; i++) {
    schedule[i] = [];
  }
  return schedule;
}

// 식당(점심/저녁/추가 1개) 배치
function placeRestaurants(sorted, restaurants, totalDays) {
  const totalRestaurants = restaurants.length;

  // 하루에 최소 들어갈 식당 수
  const base = Math.floor(totalRestaurants / totalDays);

  // 나머지(앞 날짜부터 1개씩 추가)
  let remainder = totalRestaurants % totalDays;

  let index = 0;

  for (let day = 1; day <= totalDays; day++) {
    let count = base + (remainder > 0 ? 1 : 0);

    remainder = Math.max(0, remainder - 1);

    for (let i = 0; i < count; i++) {
      if (restaurants[index]) sorted[day].push(restaurants[index]);
      index++;
    }
  }
}

// 팝업을 식당 사이에 넣기

function placePopups(sorted, popups, totalDays) {
  const totalPopups = popups.length;

  // 날짜별 최소 팝업 수
  const base = Math.floor(totalPopups / totalDays);
  let remainder = totalPopups % totalDays;

  let index = 0;

  for (let day = 1; day <= totalDays; day++) {
    const count = base + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);

    let dayPopups = popups.slice(index, index + count);
    index += count;

    // ⚠️ 팝업은 식당 사이에 넣어야 하니까:
    // 현재 날짜의 식당 리스트 중간중간에 넣는다.
    insertPopupsIntoRestaurants(sorted[day], dayPopups);
  }
}

// 팝업을 식당 사이에 자연스럽게 끼워넣는 보조 함수
function insertPopupsIntoRestaurants(dayList, popupList) {
  // dayList : 이미 식당이 들어있는 하루 일정
  // popupList : 그날 넣어야 하는 팝업 목록들

  let result = [];

  let restaurantIndex = 0;
  let popupIndex = 0;

  // 식당이 있다면 식당-팝업-식당-팝업 순
  while (restaurantIndex < dayList.length || popupIndex < popupList.length) {
    // 1) 식당 먼저 넣는다
    if (restaurantIndex < dayList.length) {
      result.push(dayList[restaurantIndex]);
      restaurantIndex++;
    }

    // 2) 그 다음 팝업을 넣는다
    if (popupIndex < popupList.length) {
      result.push(popupList[popupIndex]);
      popupIndex++;
    }
  }

  // 결과 덮어쓰기
  dayList.length = 0;
  result.forEach((item) => dayList.push(item));
}

// 숙소는 하루 마지막
function placeHotels(sorted, hotels, totalDays) {
  // 총 숙소 개수
  const totalHotels = hotels.length;

  // 마지막 날에는 숙소 넣지 않음 → 넣을 수 있는 날짜는 totalDays - 1
  const usableDays = totalDays - 1;

  // usableDays보다 숙소가 많으면 잘못된 입력이니 그냥 가능한 만큼만 배치
  const maxHotels = Math.min(usableDays, totalHotels);

  for (let day = 1; day <= maxHotels; day++) {
    sorted[day].push(hotels.shift());
  }
}

// 전체 정렬 함수
function autoSortSchedule(schedule, totalDays) {
  const { restaurants, hotels, popups } = splitItems(schedule);

  const sorted = createEmptySchedule(totalDays);

  placeRestaurants(sorted, restaurants, totalDays);
  placePopups(sorted, popups, totalDays);
  placeHotels(sorted, hotels, totalDays);

  return sorted;
}
