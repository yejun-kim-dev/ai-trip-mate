const DEFAULT_CATEGORY = "행사";

const CATEGORY_KEYS = ["category"];

const CATEGORY_KEYWORD_MAP = [
  { label: "축제", synonyms: ["축제", "페스티벌", "festival", "한마당", "문화제", "불꽃"] },
  { label: "전시", synonyms: ["전시", "exhibition", "art show", "art", "미술관", "갤러리", "화랑", "박물관"] },
  { label: "팝업", synonyms: ["팝업", "popup", "팝업스토어", "스토어"] },
  { label: "공연", synonyms: ["공연", "콘서트", "뮤지컬", "연극", "공연장", "performance", "쇼", "심포니", "오케스트라", "극단", "극장", "홀"] },
  { label: "세미나", synonyms: ["세미나", "컨퍼런스", "conference", "포럼", "forum", "교육", "강연", "워크숍", "workshop", "강의"] },
  { label: "이벤트", synonyms: ["이벤트", "event", "프로모션"] },
];


const LOCATION_CATEGORY_HINTS = [
  // 📌 전시
  { label: "전시", includes: [
    "미술관", "박물관", "뮤지엄", "갤러리", "아트센터", "art center", "전시관"
  ]},

  // 📌 팝업스토어
  { label: "팝업", includes: [
    "백화점", "현대백화점", "롯데백화점", "신세계", "스타필드",
    "이마트", "더현대", "nc백화점", "홈플러스", "아울렛",
    "몰", "쇼핑몰", "매장", "플래그십","더현대","AK", "뉴코아", "갤러리아"
  ]},
  // 📌 공연 / 콘서트 / 연극
  { label: "공연", includes: [
    "극장", "공연장", "아트홀", "콘서트홀", "뮤직홀",
    "오페라하우스", "소극장", "대극장", "문화회관", "아레나"
  ]},

  // 📌 축제 / 페스티벌
  { label: "축제", includes: [
    "광장", "공원", "야외무대", "해변", "해수욕장",
    "페스티벌", "축제장", "시장", "특설무대"
  ]},

  // 📌 세미나 / 컨퍼런스 / 교육행사
  { label: "세미나", includes: [
    "컨벤션", "컨퍼런스", "conference", "세미나실", "교육센터",
    "연구센터", "포럼", "전문센터", "아카데미", "대학", "캠퍼스", "센터"
  ]},
];


export function extractCategoryKeywords(text = "") {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = [];

  for (const { label, synonyms } of CATEGORY_KEYWORD_MAP) {
    if (synonyms.some(word => lower.includes(word.toLowerCase()))) {
      if (!found.includes(label)) found.push(label);
    }
  }

  return found;
}

export function resolvePopupCategory(popup, fallback = DEFAULT_CATEGORY) {
  if (!popup) return fallback;

  const title = (popup.name || popup.title || "").toLowerCase();
  const location = (popup.location || "").toLowerCase();

  // 1) DB category 우선
  if (popup.category && popup.category.trim().length > 0) {
    return popup.category.trim();
  }

  // 2) 장소 기반 분류
  for (const hint of LOCATION_CATEGORY_HINTS) {
    if (hint.includes.some(loc => location.includes(loc.toLowerCase()))) {
      return hint.label;
    }
  }

  // 3) 제목 기반 키워드
  const keywords = extractCategoryKeywords(title);
  if (keywords.length > 0) return keywords[0];

  return fallback;
}

export function deriveCategoryFromDb(popups = [], fallbacks = []) {
  for (const popup of popups) {
    const cat = resolvePopupCategory(popup, null);
    if (cat) return cat;
  }

  const keywordFallback = fallbacks.find(
    keyword => typeof keyword === "string" && keyword.trim().length > 0
  );

  return keywordFallback || DEFAULT_CATEGORY;
}

export { DEFAULT_CATEGORY };

export function filterEventsByCategory(events = [], keywords = []) {
  if (!events || events.length === 0 || keywords.length === 0) return events;

  const lowerKeywords = keywords.map(k => k.toLowerCase());

  return events.filter(event => {
    const category = resolvePopupCategory(event, "").toLowerCase();
    const title = (event.name || event.title || "").toLowerCase();
    const location = (event.location || "").toLowerCase();

    return lowerKeywords.some(keyword =>
      category.includes(keyword) ||
      title.includes(keyword) ||
      location.includes(keyword)
    );
  });
}
