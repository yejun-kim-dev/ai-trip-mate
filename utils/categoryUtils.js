// ==============================
//  categoryUtils.js — 최종 리팩토링
//  🔥 DB category 컬럼만 사용하도록 전면 개선
// ==============================

const DEFAULT_CATEGORY = "행사";

// ✔ 더 이상 키워드 기반 매핑 사용하지 않음
export function extractCategoryKeywords(text = "") {
  if (!text) return [];
  // 사용자가 직접 입력한 "팝업", "전시", "공연" 같은 단어만 추출
  const lower = text.toLowerCase();

  const keywords = ["팝업", "전시", "공연", "축제", "뮤지컬", "페스티벌", "이벤트"];
  return keywords.filter(k => lower.includes(k));
}

// ✔ 카테고리는 DB에 있는 category 값만 사용
export function resolvePopupCategory(popup, fallback = DEFAULT_CATEGORY) {
  if (!popup) return fallback;

  if (popup.category && popup.category.trim().length > 0) {
    return popup.category.trim();
  }

  return fallback;
}

// ✔ 여러 이벤트 중 공통 카테고리를 추출 → DB category만 사용
export function deriveCategoryFromDb(popups = [], fallbacks = []) {
  for (const popup of popups) {
    if (popup.category && popup.category.trim().length > 0) {
      return popup.category.trim();
    }
  }
  // fallback keywords (예: "팝업 알려줘" 등)
  const keywordFallback = fallbacks.find(
    k => typeof k === "string" && k.trim().length > 0
  );

  return keywordFallback || DEFAULT_CATEGORY;
}

// ✔ 필터는 오직 category로만 수행
export function filterEventsByCategory(events = [], keywords = []) {
  if (!events || events.length === 0) return events;
  if (!keywords || keywords.length === 0) return events;

  const lowerKeywords = keywords.map(k => k.toLowerCase());

  return events.filter(event => {
    const cat = (event.category || "").toLowerCase();
    return lowerKeywords.some(keyword => cat.includes(keyword));
  });
}

export { DEFAULT_CATEGORY };
