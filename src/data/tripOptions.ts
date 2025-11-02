export const countryData = [
  { code: "KR", name: "대한민국", flag: "🇰🇷" },
  { code: "GH", name: "가나", flag: "🇬🇭" },
  { code: "GA", name: "가봉", flag: "🇬🇦" },
  { code: "US", name: "미국", flag: "🇺🇸" },
  { code: "JP", name: "일본", flag: "🇯🇵" },
];

// ✅ 국가별 도시 데이터 매핑
export const cityDataByCountry: Record<string, { name: string }[]> = {
  "대한민국": [
    { name: "서울" },
    { name: "부산" },
    { name: "제주" },
    { name: "인천" },
    { name: "대구" },
  ],
  "가나": [
    { name: "아크라" },
    { name: "쿠마시" },
    { name: "타말레" },
  ],
  "가봉": [
    { name: "리브르빌" },
    { name: "포트젠틸" },
  ],
  "미국": [
    { name: "뉴욕" },
    { name: "샌프란시스코" },
    { name: "시카고" },
    { name: "로스앤젤레스" },
  ],
  "일본": [
    { name: "도쿄" },
    { name: "오사카" },
    { name: "교토" },
    { name: "후쿠오카" },
  ],
};
