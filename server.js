import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
import * as chrono from "chrono-node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchNaverPopupList } from "./utils/fetchNaverPopupList.js";
import { formatPopupResponse } from "./utils/formatPopupResponse.js";
import { citiesByCountry } from "./utils/citiesByCountry.js";


// ✅ 추가된 부분
//import { fetchInstagramPopups } from "./instagram/popupCrawler.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ==============================
// 1) 데이터 수집 유틸
// ==============================

// 공식 전시 (네이버 전시 검색)
async function fetchEvents(region) {
  const query = `${region} 전시`;
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(
    query
  )}&display=10&sort=random`;

  try {
    const res = await axios.get(url, {
      headers: {
        "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
      },
    });
    return res.data.items || [];
  } catch (err) {
    console.error("❌ 전시 API 오류:", err?.response?.data || err.message);
    return [];
  }
}

// 팝업 (네이버 블로그 최신순) + 날짜 필터링
async function fetchPopups(region, startDate, endDate) {
  const query = `${region} 팝업스토어`;
  const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(
    query
  )}&display=20&sort=date`;

  try {
    const res = await axios.get(url, {
      headers: {
        "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
      },
    });

    const items = res.data.items || [];

    return items
      .map((i) => {
        const text = `${i.title} ${i.description}`.replace(/<[^>]+>/g, "");
        const detectedDate = chrono.parseDate(text);
        return {
          title: i.title.replace(/<[^>]+>/g, ""),
          link: i.link,
          desc: i.description.replace(/<[^>]+>/g, ""),
          date: detectedDate || null,
        };
      })
      .filter((p) => {
        if (!startDate || !endDate) return true;
        if (!p.date) return false;
        return p.date >= startDate && p.date <= endDate;
      });
  } catch (err) {
    console.error("❌ 팝업 API 오류:", err?.response?.data || err.message);
    return [];
  }
}

// ==============================
// 2) 데이터 제공 API
// ==============================
app.get("/api/events-data", async (req, res) => {
  try {
    const region = req.query.region || "전국";
    const q = req.query.q || "";

    const parsed = chrono.parse(q);
    let startDate = null;
    let endDate = null;
    if (parsed.length > 0) {
      startDate = parsed[0].start?.date();
      endDate = parsed[0].end?.date() || startDate;
    }

    // ✅ 인스타 팝업 추가된 부분
    const [events, popupsBlog, popupsInsta, popupsNaver] = await Promise.all([
      fetchEvents(region),
      fetchPopups(region, startDate, endDate),
      fetchInstagramPopups(region, startDate, endDate),
      fetchNaverPopupList(region, startDate, endDate),
    ]);

    const popups = [...popupsBlog, ...popupsInsta, ...popupsNaver]; // ✅ 합치기

    res.json({ popups, exhibitions });
  } catch (error) {
    console.error("❌ events-data API 오류:", error.message);
    res.status(500).json({ error: "서버 이벤트 데이터 처리 오류" });
  }
});

// ==============================
// 3) AI Chat Route
// ==============================
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "메시지가 없습니다." });

    // 날짜 파싱
    const parsed = chrono.parse(message);
    let startDate = null;
    let endDate = null;

    if (parsed.length >= 2) {
      startDate = chrono.parseDate(parsed[0].text);
      endDate = chrono.parseDate(parsed[1].text);
    } else if (parsed.length === 1) {
      startDate = chrono.parseDate(parsed[0].text);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 2);
    }

    if (!startDate || !endDate) {
      startDate = new Date();
      endDate = new Date();
      endDate.setDate(startDate.getDate() + 2);
    }

    // 지역 파싱
    const regionMatch = message.match(
      /(서울|부산|대구|대전|광주|인천|제주|수원|울산)/
    );
    const region = regionMatch ? regionMatch[0] : "전국";

    // popups API 호출
    const popResp = await fetch(`http://localhost:1000/api/popups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
      }),
    });

    const { popups } = await popResp.json();

    // ✅ AI 추론 없이 → 실제 팝업 리스트 그대로 예쁘게
    const reply = formatPopupResponse(popups, region);

    return res.json({ reply });
  } catch (err) {
    console.error("❌ Chat Route Error:", err);
    res.status(500).json({ error: "서버 내부 오류" });
  }
});

const PORT = 1000;
// ==============================
// 4) 국가 리스트 API
// ============================app.get("/api/countries", async (req, res) => {
// ==============================
// 4) 한국어 국가 리스트 API
// ==============================
import https from "https";

app.get("/api/countries", async (req, res) => {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });

    // ✅ 한국어 번역 포함된 국가 리스트 요청
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
    res.status(500).json({ error: "한국어 국가 목록 불러오기 실패" });
  }
});
// ==============================
// 5) 도시 리스트 API
// ==============================
app.get("/api/cities", (req, res) => {
  const countryQuery = req.query.country; // 예: 대한민국, 일본 등

  if (!countryQuery) {
    return res
      .status(400)
      .json({ error: "country 쿼리값 필요 (예: ?country=대한민국)" });
  }

  const cities = citiesByCountry[countryQuery];

  if (!cities) {
    return res.status(404).json({ error: "해당 국가의 도시 목록이 없습니다." });
  }

  res.json({ country: countryQuery, cities });
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

app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);

app.post("/api/popups", async (req, res) => {
  const { region, startDate, endDate } = req.body;

  if (!region || !startDate || !endDate) {
    return res.status(400).json({ error: "region, startDate, endDate 필요" });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const popups = await fetchNaverPopupList(region, start, end);

  res.json({ popups });
});
