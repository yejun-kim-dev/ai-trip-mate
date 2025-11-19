// utils/fetchNaverPopupList.js

import axios from "axios";
import * as cheerio from "cheerio";
import { cleanName } from "./cleanName.js";

export async function fetchNaverPopupList(region, startDate, endDate) {
  const query = `${region} 팝업`;
  const searchURL = `https://search.naver.com/search.naver?query=${encodeURIComponent(
    query
  )}`;

  try {
    const res = await axios.get(searchURL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
    });

    const $ = cheerio.load(res.data);
    const results = [];

    $(".place_list .place_item, .list_item").each((_, el) => {
      const rawName = $(el)
        .find(".place_bluelink, .title, .name")
        .text()
        .trim();

      const name = cleanName(rawName); // ⭐ 정제된 팝업 이름 ⭐

      const url = $(el).find("a").attr("href");
      const location = $(el).find(".place_addr, .addr, .text").text().trim();

      const dateText = $(el).find(".period, .date, .info").text().trim();
      const hours = $(el).find(".time, .opening_time").text().trim();

      if (!name || !url) return;

      // 날짜 파싱
      const dateMatch = dateText.match(
        /(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})\s*[~]\s*(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/
      );

      let period = null;

      if (dateMatch) {
        const start = new Date(dateMatch[1], dateMatch[2] - 1, dateMatch[3]);
        const end = new Date(dateMatch[4], dateMatch[5] - 1, dateMatch[6]);

        if (!(end >= startDate && start <= endDate)) return;

        period = `${start.toISOString().slice(0, 10)} ~ ${end
          .toISOString()
          .slice(0, 10)}`;
      }

      results.push({
        category: "팝업",
        name, // ⭐ 깨끗한 이름
        location: location || region,
        period,
        hours: hours || null,
        source: "네이버검색",
        url,
      });
    });

    return results;
  } catch (err) {
    console.error("❌ 네이버 팝업 크롤링 오류:", err.message);
    return [];
  }
}
