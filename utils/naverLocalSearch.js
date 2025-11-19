// utils/naverLocalSearch.js
import axios from "axios";

export async function searchLocal(keyword) {
  try {
    const url = "https://openapi.naver.com/v1/search/local.json";

    const res = await axios.get(url, {
      params: {
        query: keyword,
        display: 5,
      },
      headers: {
        "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
      },
    });

    const items = res.data.items;
    if (!items || items.length === 0) return null;

    const best = items[0];

    // 시/구 추출
    const addr = best.roadAddress || best.address || "";
    let area = "";

    const m = addr.match(/(서울|대구|대전|부산|울산|광주|인천)\s(\S+구)/);
    if (m) {
      area = `${m[1]} ${m[2]}`;
    }

    return {
      title: best.title.replace(/<[^>]+>/g, ""),
      area,
      address: best.address,
      roadAddress: best.roadAddress,
      mapx: best.mapx,
      mapy: best.mapy,
    };
  } catch (e) {
    console.log("❌ 네이버 지역검색 오류:", keyword, e.message);
    return null;
  }
}
