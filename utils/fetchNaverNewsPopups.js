// utils/fetchNaverNewsPopups.js
import axios from "axios";
import * as chrono from "chrono-node";
import * as xml2js from "xml2js";

const REGION_KEYWORDS = [
  "성수",
  "홍대",
  "가로수길",
  "여의도",
  "청담",
  "명동",
  "한남",
  "강남",
  "송파",
  "건대",
  "삼청동",
  "이태원",
  "합정",
  "압구정",
  "가산",
  "목동",
  "문래",
  "제주",
  "부산",
  "대구",
  "대전",
  "광주",
  "울산",
  "수원",
  "창원",
  "전주",
  "춘천",
  "세종",
  "인천",
];

const RSS_URLS = [
  "https://news.google.com/rss/search?q=%ED%8C%9D%EC%97%85&hl=ko&gl=KR&ceid=KR:ko",
  "https://news.google.com/rss/search?q=%EC%A0%84%EC%8B%9C&hl=ko&gl=KR&ceid=KR:ko",
  "https://news.google.com/rss/search?q=%EA%B3%B5%EC%97%B0&hl=ko&gl=KR&ceid=KR:ko",
  "https://news.google.com/rss/search?q=%EC%B6%95%EC%A0%9C&hl=ko&gl=KR&ceid=KR:ko",
];

export async function fetchNaverNewsPopups() {
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
        const name = item.title?.[0];
        const desc = item.description?.[0] ?? "";
        const link = item.link?.[0];

        if (!name || !link) continue;

        const cleanName = name.replace(/<[^>]+>/g, "").trim();
        const cleanDesc = desc.replace(/<[^>]+>/g, "").trim();

        const location =
          REGION_KEYWORDS.find(
            (r) => cleanName.includes(r) || cleanDesc.includes(r)
          ) || "전국";

        let period = null;
        const parsedDate = chrono.parse(cleanDesc);
        const start = parsedDate?.[0]?.start?.date();
        const end = parsedDate?.[0]?.end?.date() ?? start;
        if (start && end) {
          period = `${start.toISOString().slice(0, 10)} ~ ${end
            .toISOString()
            .slice(0, 10)}`;
        }

        results.push({
          category: "팝업",
          name: cleanName,
          location,
          period,
          hours: null,
          source: "네이버뉴스RSS",
          url: link,
        });
      }
    } catch (err) {
      console.error("❌ RSS fetch error:", err.message);
    }
  }

  console.log(`🔎 RSS 수집 결과: ${results.length}건`);
  return results;
}
