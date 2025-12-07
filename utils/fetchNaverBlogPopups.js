// utils/fetchNaverBlogPopups.js

import axios from "axios";
import * as cheerio from "cheerio";

import { extractPlaceName } from "./locationExtractor.js";
import { cleanName } from "./cleanName.js";

import {
  loadNaverBlogText,
  extractRawPeriod,
  buildPeriod,
  extractHours,
} from "./repairShared.js";

export async function fetchNaverBlogPopups() {
  console.log("📡 네이버 블로그 팝업 수집 시작...");

  const query = "팝업스토어 OR 팝업 OR 행사";

  const allResults = [];

  for (let start = 1; start <= 1000; start += 100) {
    const apiUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(
      query
    )}&display=100&start=${start}&sort=date`;

    try {
      const res = await axios.get(apiUrl, {
        headers: {
          "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
          "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
        },
      });

      const items = res.data?.items ?? [];
      console.log(`🧩 ${start} ~ ${start + items.length - 1} 수집 중...`);

      for (const it of items) {
        const title = it.title.replace(/<[^>]+>/g, "").trim(); // HTML 제거
        const cleanTitle = cleanName(title); // ⭐ 이름 정제 ⭐

        const link = it.link;
        const desc = it.description.replace(/<[^>]+>/g, "").trim();

        let fullText = desc;
        const loaded = await loadNaverBlogText(link);
        if (loaded) fullText = loaded;

        // 2) 기간
        let period = null;
        const [rawStart, rawEnd] = extractRawPeriod(fullText);
        if (rawStart && rawEnd) {
          period = buildPeriod(rawStart, rawEnd);
        }

        // 3) 운영시간
        const hours = extractHours(fullText);

        // 4) 위치 추출 + 정제
        const rawPlace = extractPlaceName(fullText);
        const location = rawPlace ? rawPlace : null;   // 전국 제거


        allResults.push({
          category: "팝업",
          name: cleanTitle, // ⭐ 깔끔한 이름
          location,
          period,
          hours,
          source: "네이버블로그",
          url: link,
        });
      }
    } catch (err) {
      console.error("❌ 네이버 API 오류:", err.message);
    }
  }

  console.log(`✅ 블로그 팝업 수집 완료: ${allResults.length}건`);
  return allResults;
}
