// utils/fetchKCISASpecial.js
import axios from "axios";

export async function fetchKCISASpecial() {
  const KEY = encodeURIComponent(process.env.DATA_GO_SERVICE_KEY); // ✅ 특별전시는 이 키!

  const url =
    "https://api.kcisa.kr/openapi/service/rest/meta2020/getMCHBspecial";

  const { data } = await axios.get(url, {
    timeout: 15000,
    params: {
      serviceKey: KEY, // ✅ 인코딩된 키 사용
      pageNo: 1,
      numOfRows: 200,
      MobileOS: "ETC",
      MobileApp: "AppTest",
    },
  });

  const items = data?.response?.body?.items?.item ?? [];

  return items.map((i) => ({
    category: "특별전시",
    name: i?.title ?? null,
    period: i?.date ?? null,
    location: i?.spatialCoverage ?? null,
    hours: null,
    source: "KCISA 특별전시 API",
    url:
      i?.refineUrl || `kcisa-special://${encodeURIComponent(i?.title ?? "")}`,
  }));
}
