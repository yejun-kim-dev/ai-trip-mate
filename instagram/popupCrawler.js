// instagram/popupCrawler.js
import puppeteer from "puppeteer";
import * as chrono from "chrono-node";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchInstagramPopups(region, startDate, endDate) {
  const keyword = `${region} 팝업`;
  const sessionId = process.env.INSTAGRAM_SESSIONID;

  if (!sessionId) {
    console.error("❌ INSTAGRAM_SESSIONID 가 .env에 없습니다!");
    return [];
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setCookie({
    name: "sessionid",
    value: sessionId,
    domain: ".instagram.com",
    path: "/",
    httpOnly: true,
    secure: true,
  });

  await page.goto(
    `https://www.instagram.com/explore/tags/${encodeURIComponent(keyword)}/`,
    { waitUntil: "networkidle2" }
  );

  await delay(2000);

  const postLinks = await page.$$eval("a", (aTags) =>
    aTags
      .map((a) => a.href)
      .filter((href) => href.includes("/p/"))
      .slice(0, 15)
  );

  const results = [];

  for (const link of postLinks) {
    await page.goto(link, { waitUntil: "networkidle2" });
    await delay(1200);

    const text = await page
      .$eval("meta[property='og:description']", (el) =>
        el.getAttribute("content")
      )
      .catch(() => null);

    if (!text) continue;

    // -------------------------------------
    // ① 기본 날짜 감지 (chrono)
    // -------------------------------------
    const parsed = chrono.parse(text);
    let detectedStart = parsed[0]?.start?.date() || null;
    let detectedEnd = parsed[0]?.end?.date() || detectedStart;

    // -------------------------------------
    // ② YYYY.MM.DD ~ YYYY.MM.DD 형식 감지
    // -------------------------------------
    const rangeRegex =
      /(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})\s*[~\-]\s*(\d{4})?[.\-\/](\d{1,2})[.\-\/](\d{1,2})/;
    const match = text.match(rangeRegex);

    if (match) {
      const y1 = Number(match[1]);
      const m1 = Number(match[2]) - 1;
      const d1 = Number(match[3]);

      const y2 = match[4] ? Number(match[4]) : y1;
      const m2 = Number(match[5]) - 1;
      const d2 = Number(match[6]);

      detectedStart = new Date(y1, m1, d1);
      detectedEnd = new Date(y2, m2, d2);
    }

    // -------------------------------------
    // ③ "~ 1월까지" / "2월까지" / "연장 운영"
    // -------------------------------------
    const untilMonthRegex = /(\d{1,2})월\s*까지/;
    const um = text.match(untilMonthRegex);

    if (um) {
      const nowYear = new Date().getFullYear();
      const month = Number(um[1]) - 1;
      detectedStart = detectedStart || new Date(nowYear, month - 1, 1); // 최소 시작 추정
      detectedEnd = new Date(nowYear, month, 0); // 해당 월의 마지막 날
    }

    // 연장 운영 / 상시 운영 → 종료일 없음 → 여행 기간에 걸리면 통과
    if (/연장|상시|ongoing|open\s*ended/i.test(text)) {
      detectedStart = detectedStart || new Date();
      detectedEnd = new Date(new Date().getFullYear() + 1, 11, 31); // 1년 후까지 유효 처리
    }

    // -------------------------------------
    // ④ 여행 날짜와 실제 운영 날짜 겹치는지 확인
    // -------------------------------------
    if (
      startDate &&
      endDate &&
      detectedStart &&
      detectedEnd &&
      detectedEnd >= startDate &&
      detectedStart <= endDate
    ) {
      results.push({
        title: text.split("\n")[0].slice(0, 40),
        link,
        dateRange: `${detectedStart.toISOString().slice(0, 10)} ~ ${detectedEnd
          .toISOString()
          .slice(0, 10)}`,
      });
    }
  }

  await browser.close();
  return results;
}
