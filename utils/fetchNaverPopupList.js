import axios from "axios";
import * as cheerio from "cheerio";

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

    // ✅ 네이버 검색에서 팝업은 대부분 "place_list" 또는 "list_item" 구조
    $(".place_list .place_item, .list_item").each((_, el) => {
      const name = $(el).find(".place_bluelink, .title, .name").text().trim();
      const url = $(el).find("a").attr("href");
      const location = $(el).find(".place_addr, .addr, .text").text().trim();
      const dateText = $(el).find(".period, .date, .info").text().trim();
      const hours = $(el).find(".time, .opening_time").text().trim();

      if (!name || !url) return;

      // ✅ 날짜 파싱 로직 개선 (YYYY.MM.DD ~ YYYY.MM.DD)
      const dateMatch = dateText.match(
        /(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})\s*[~]\s*(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/
      );
      let period = null;

      if (dateMatch) {
        const start = new Date(dateMatch[1], dateMatch[2] - 1, dateMatch[3]);
        const end = new Date(dateMatch[4], dateMatch[5] - 1, dateMatch[6]);

        // ✅ 여행 기간과 겹치는지 확인
        if (!(end >= startDate && start <= endDate)) return;

        period = `${start.toISOString().slice(0, 10)} ~ ${end
          .toISOString()
          .slice(0, 10)}`;
      }

      results.push({
        category: "팝업",
        name,
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
