// utils/fetchNaverBlogPopups.js
import axios from "axios";
import * as chrono from "chrono-node";
import * as cheerio from "cheerio";

export async function fetchNaverBlogPopups() {
  console.log("📡 네이버 블로그 팝업 수집 시작...");

  const query = "팝업스토어 OR 팝업 OR 전시 OR 행사";
  const allResults = [];

  for (let start = 1; start <= 1000; start += 100) {
    const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(
      query
    )}&display=100&start=${start}&sort=date`;

    try {
      const res = await axios.get(url, {
        headers: {
          "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
          "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
        },
        timeout: 10000,
      });

      const items = res.data?.items ?? [];
      console.log(`🧩 ${start}~${start + items.length - 1}번 수집 중...`);

      for (const it of items) {
        const title = it.title.replace(/<[^>]+>/g, "").trim();
        const link = it.link.trim();
        const desc = it.description.replace(/<[^>]+>/g, "").trim();
        let fullText = desc;

        try {
          const html = await axios.get(link);
          const $ = cheerio.load(html.data);
          const iframe = $("iframe#mainFrame").attr("src");

          if (iframe?.includes("naverblog")) {
            const realUrl = "https://blog.naver.com" + iframe;
            const realHtml = await axios.get(realUrl);
            const $$ = cheerio.load(realHtml.data);
            fullText = $$("body").text().replace(/\s+/g, " ");
          } else {
            fullText = $("body").text().replace(/\s+/g, " ");
          }
        } catch (err) {
          console.warn(`⚠️ 본문 불러오기 실패: ${link}`);
        }

        // 날짜 추출
        const parsed = chrono.parse(fullText);
        let period = null;
        if (parsed.length > 0) {
          const s = parsed[0]?.start?.date();
          const e = parsed[0]?.end?.date() ?? s;
          if (s && e)
            period = `${s.toISOString().slice(0, 10)} ~ ${e
              .toISOString()
              .slice(0, 10)}`;
        }

        // 운영시간 추출
        const timeMatch = fullText.match(
          /(운영시간|영업시간|오픈|open)[^\n:]*\d{1,2}\s?(시|:)\s?\d{0,2}\s?(분)?\s?~\s?\d{1,2}\s?(시|:)\s?\d{0,2}/
        );
        const hours = timeMatch ? timeMatch[0].trim() : null;

        allResults.push({
          category: "팝업",
          name: title,
          location: "전국",
          period,
          hours,
          source: "네이버블로그",
          url: link,
        });
      }
    } catch (err) {
      console.error("❌ 네이버 블로그 크롤러 오류:", err.message);
    }
  }

  console.log(`✅ 블로그 본문 포함 팝업 수집 완료: ${allResults.length}건`);
  return allResults;
}
