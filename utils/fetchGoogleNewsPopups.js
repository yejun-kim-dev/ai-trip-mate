// utils/fetchGoogleNewsPopups.js
import axios from "axios";
import * as xml2js from "xml2js";
import { extractPlaceName } from "./locationExtractor.js";

// -------------------------
// 1) 행사명 패턴 정의
// -------------------------
const EVENT_NAME_PATTERNS = [
  /(.*?)팝업스토어/g,
  /(.*?)팝업/g,
  /(.*?)전시회/g,
  /(.*?)전시/g,
  /(.*?)공연/g,
  /(.*?)콘서트/g,
  /(.*?)뮤지컬/g,
  /(.*?)페스티벌/g,
];

// -------------------------
// 2) GOOGLE NEWS RSS URLS
// -------------------------
const RSS_URLS = [
  "https://news.google.com/rss/search?q=팝업&hl=ko&gl=KR&ceid=KR:ko",
  "https://news.google.com/rss/search?q=전시&hl=ko&gl=KR&ceid=KR:ko",
  "https://news.google.com/rss/search?q=공연&hl=ko&gl=KR&ceid=KR:ko",
  "https://news.google.com/rss/search?q=축제&hl=ko&gl=KR&ceid=KR:ko",
];

// -------------------------
export async function fetchGoogleNewsPopups() {
  const parser = new xml2js.Parser();
  let results = [];

  for (const url of RSS_URLS) {
    try {
      const { data } = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 15000,
      });

      const parsed = await parser.parseStringPromise(data);
      const items = parsed?.rss?.channel?.[0]?.item || [];

      for (const item of items) {
        const title = item.title?.[0] || "";
        const description = item.description?.[0] || "";
        const merged = `${title} ${description}`;

        // 1) 행사명 추출
        const eventName = extractEventName(merged);
        if (!eventName) continue;

        // 2) 위치 추출 (없으면 전국)
        const location =
          extractPlaceName(merged) ||
          extractPlaceName(title) ||
          extractPlaceName(description) ||
          "전국";

        // 3) 기간은 RSS에 없음 → null
        const period = null;

        // 4) 결과 추가
        results.push({
          category: "뉴스",
          name: eventName,
          location,
          period,
          hours: null,
          source: "GoogleNewsRSS",
          url: item.link?.[0] || null,
        });
      }
    } catch (err) {
      console.error("❌ RSS fetch error:", err.message);
    }
  }

  console.log(`📰 뉴스 기반 행사 수집: ${results.length}건`);
  return results;
}

// -------------------------
// 🎯 행사명 추출 함수
// -------------------------
function extractEventName(text) {
  for (const pattern of EVENT_NAME_PATTERNS) {
    const match = pattern.exec(text);
    if (match && match[0]) return cleanEventName(match[0]);
  }
  return null;
}

function cleanEventName(name) {
  return name.replace(/\s{2,}/g, " ").trim();
}
