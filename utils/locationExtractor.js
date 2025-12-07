// utils/locationExtractor.js

// ------------------------------
// 0) 브랜드 표준화
// ------------------------------
const BRAND_MAP = {
  롯데: "롯데백화점",
  롯데백화점: "롯데백화점",
  현대: "현대백화점",
  현대백화점: "현대백화점",
  신세계: "신세계백화점",
  신세계백화점: "신세계백화점",
  엔씨: "NC백화점",
  NC: "NC백화점",
  NC백화점: "NC백화점",
  스타필드: "스타필드",
  더현대: "더현대",
  이마트: "이마트",
  홈플러스: "홈플러스",
  코엑스: "코엑스",
};

// ------------------------------
// 1) 광역시/도 매핑
// ------------------------------
const REGION_MAP = [
  {
    region: "서울",
    keywords: ["서울", "성수", "홍대", "강남", "잠실", "건대", "삼성", "선릉", "광화문", "을지로", "용산", "명동", "청담", "미아", "왕십리", "여의도", "합정", "신촌", "마포", "동대문", "서대문"]
  },
  {
    region: "부산",
    keywords: ["부산", "서면", "해운대", "광안리", "남포", "동래"]
  },
  {
    region: "대구",
    keywords: ["대구", "동성로", "수성", "달서"]
  },
  {
    region: "인천",
    keywords: ["인천", "송도", "부평"]
  },
  { region: "대전", keywords: ["대전"] },
  { region: "광주", keywords: ["광주"] },
  { region: "울산", keywords: ["울산"] },
  {
    region: "경기",
    keywords: ["경기", "수원", "성남", "일산", "분당", "판교", "고양", "용인", "부천", "광명", "안양", "의정부"]
  },
  { region: "제주", keywords: ["제주"] },
];

// ------------------------------
// 2) 상세 장소 패턴
// ------------------------------
const PLACE_PATTERNS = [
  /([가-힣A-Za-z0-9]+)\s?백화점/g,
  /(더현대|현대백화점|롯데백화점|신세계백화점)/g,
  /(스타필드|AK플라자|아울렛|NC백화점|홈플러스|이마트)/g,
  /([가-힣A-Za-z0-9]+)몰/g,
  /([가-힣A-Za-z0-9]+)센터/g,
  /([가-힣A-Za-z0-9]+)타워/g,
  /([가-힣A-Za-z0-9]+)플래그십/g,
  /([가-힣A-Za-z0-9]+)본점/g,
  /([가-힣A-Za-z0-9]+)점/g,
  /([가-힣]+)역/g,
  /([가-힣]+)동/g,
  /([가-힣]+)구/g,
];

// ------------------------------
// 🔥 최종 장소 추출기
// ------------------------------
export function extractPlaceName(text = "") {
  if (!text) return null;

  let placeCandidates = [];
  let region = null;
  let brand = null;

  // 1) 브랜드 추출
  for (const b of Object.keys(BRAND_MAP)) {
    if (text.includes(b)) {
      brand = BRAND_MAP[b];
      break;
    }
  }

  // 2) 상세 장소 패턴 매칭 (코엑스몰, 롯데백화점, 성수동 등)
  for (const p of PLACE_PATTERNS) {
    const matches = [...text.matchAll(p)];
    for (const m of matches) {
      placeCandidates.push(m[0]);
    }
  }

  // 3) 지역(광역시) 매핑
  for (const r of REGION_MAP) {
    if (r.keywords.some(k => text.includes(k))) {
      region = r.region;
      break;
    }
  }

  // ================================
  // CASE 1 — 지역 + 장소 둘 다 있음
  // ================================
  if (region && placeCandidates.length > 0) {
    const p = placeCandidates[0].replace(/\s+/g, "");
    return `${region} ${p}`;
  }

  // ================================
  // CASE 2 — 브랜드 + 지역
  // ================================
  if (brand && region) {
    return `${region} ${brand}`;
  }

  // ================================
  // CASE 3 — 지역만 있음
  // ================================
  if (region) return region;

  // ================================
  // CASE 4 — 장소만 있음 (지역은 추론해야함)
  // ================================
  if (placeCandidates.length > 0) {
    const p = placeCandidates[0].replace(/\s+/g, "");
    // 장소명 안에 지역 keyword가 있는 경우 매핑
    for (const r of REGION_MAP) {
      if (r.keywords.some(k => p.includes(k))) {
        return `${r.region} ${p}`;
      }
    }
    return p;
  }

  return null;
}
