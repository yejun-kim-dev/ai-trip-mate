import axios from "axios";
import * as cheerio from "cheerio";

export async function fetchNaverPopupList(region, startDate, endDate) {
  const query = `${region} 팝업`;
  const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(
    query
  )}`;

  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(res.data);
    const result = [];

    $(".list_item, .total_wrap").each((_, el) => {
      const title = $(el).find(".name, .title, .total_tit").text().trim();
      const link = $(el).find("a").attr("href");
      const dateRaw = $(el).find(".date, .sub_text, .sub_time").text().trim();

      if (!title || !link || !dateRaw) return;

      const match = dateRaw.match(
        /(\d{2})\.(\d{2})\.(\d{2})\.?\s*~\s*(\d{2})\.(\d{2})\.(\d{2})\.?/
      );

      if (!match) return;

      const start = new Date(
        2000 + Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      );
      const end = new Date(
        2000 + Number(match[4]),
        Number(match[5]) - 1,
        Number(match[6])
      );

      // 여행 날짜 조건 필터링
      if (end >= startDate && start <= endDate) {
        result.push({
          title,
          link,
          date: `${start.toISOString().slice(0, 10)} ~ ${end
            .toISOString()
            .slice(0, 10)}`,
        });
      }
    });

    return result;
  } catch (err) {
    console.error("❌ 네이버 팝업 검색 크롤러 오류:", err);
    return [];
  }
}
