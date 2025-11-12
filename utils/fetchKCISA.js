// utils/fetchKCISA.js
import axios from "axios";

export async function fetchKCISAEvents() {
  const KEY = process.env.KCISA_SERVICE_KEY;

  const url = "https://api.kcisa.kr/openapi/service/rest/meta7/getMCHB3302";

  const { data } = await axios.get(url, {
    timeout: 15000,
    params: {
      serviceKey: KEY,
      pageNo: 1,
      numOfRows: 200,
      MobileOS: "ETC", // ✅ 반드시 필요
      MobileApp: "AppTest", // ✅ 반드시 필요
    },
  });

  const items = data?.response?.body?.items?.item ?? [];

  return items.map((i) => {
    const generatedUrl = `kcisa://${encodeURIComponent(
      `${i?.title ?? ""}-${i?.spatialCoverage ?? ""}`
    )}`;

    return {
      category: "학술행사",
      name: i?.title ?? null,
      period: i?.date ?? null,
      location: i?.spatialCoverage ?? null,
      hours: null,
      source: "KCISA 학술행사 API",
      url: i?.refineUrl || generatedUrl,
    };
  });
}
