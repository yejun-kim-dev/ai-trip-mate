export function extractMemoryConcepts(text) {
  const result = {
    country: null,
    city: null,
    companions: [],
    duration: null,
    categories: [],
    brandOrKeyword: [],
    dateRange: null,
    intent: null,
  };

  // --- 날짜 감지 ---
  const dateRangePattern =
    /(?:(\d{4})년)?\s*(\d{1,2})월\s*(\d{1,2})일\s*(?:부터|~|-|–|—)?\s*(?:(\d{1,2})월)?\s*(?:(\d{1,2})일)?/;
  const match = text.match(dateRangePattern);
  if (match) {
    const year = match[1] || new Date().getFullYear();
    const start = `${year}년 ${match[2]}월 ${match[3]}일`;
    const end =
      match[5] || match[4]
        ? `${year}년 ${match[4] || match[2]}월 ${match[5] || match[3]}일`
        : null;
    result.dateRange = end ? `${start} ~ ${end}` : start;
  }

  // --- 국가/도시 감지 ---
  const countryMap = {
    한국: ["서울", "부산", "대구", "인천", "제주", "광주", "수원"],
    일본: ["도쿄", "오사카", "교토", "삿포로"],
    프랑스: ["파리", "리옹", "니스"],
    미국: ["뉴욕", "LA", "샌프란시스코", "하와이", "시애틀"],
    독일: ["베를린", "뮌헨", "프랑크푸르트"],
    영국: ["런던", "맨체스터"],
    이탈리아: ["로마", "베니스", "피렌체"],
    스페인: ["바르셀로나", "마드리드"],
  };

  // 국가 이름이 직접 언급된 경우
  for (const country of Object.keys(countryMap)) {
    if (text.includes(country)) {
      result.country = country;
    }
  }

  // 도시 기반으로 추론
  if (!result.country) {
    for (const [country, cities] of Object.entries(countryMap)) {
      for (const city of cities) {
        if (text.includes(city)) {
          result.city = city;
          result.country = country;
          break;
        }
      }
    }
  } else {
    // 이미 국가가 감지된 경우, 해당 국가 안의 도시 중 하나가 포함되어 있으면 city 세팅
    const possibleCities = countryMap[result.country];
    const cityFound = possibleCities.find((c) => text.includes(c));
    if (cityFound) result.city = cityFound;
  }

  // --- 동반자 ---
  const companions = ["친구", "가족", "연인", "혼자", "아이", "부모님"];
  result.companions = companions.filter((c) => text.includes(c));

  // --- 카테고리 ---
  const categories = ["전시", "팝업", "카페", "자연", "음식", "공연", "축제", "체험"];
  result.categories = categories.filter((c) => text.includes(c));

  // --- 브랜드 / 키워드 ---
  const brandMatch = text.match(/([가-힣A-Za-z0-9]+)\s*(팝업|전시|페스티벌|카페)/);
  if (brandMatch) result.brandOrKeyword.push(brandMatch[1]);

  // --- 의도 ---
  if (text.includes("추천") || text.includes("알려줘")) result.intent = "콘텐츠추천";
  else if (text.includes("일정") || text.includes("코스")) result.intent = "일정생성";
  else if (text.includes("날씨")) result.intent = "정보요청";

  return result;
}
