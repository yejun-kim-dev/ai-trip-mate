// ===============================
// 0) 허용된 브랜드 + 지역 조합 정의
// ===============================

// 백화점 브랜드 (표준화)
const BRAND_MAP = {
  롯데: "롯데백화점",
  롯데백화점: "롯데백화점",
  현대: "현대백화점",
  현대백화점: "현대백화점",
  신세계: "신세계백화점",
  신세계백화점: "신세계백화점",
  NC: "NC백화점",
  엔씨: "NC백화점",
  NC백화점: "NC백화점",
};

// 실제 지역(지점) whitelist – location에 들어갈 수 있는 단어들
// 백화점 지점명 목록 (한국 전역)
const VALID_BRANCHES = [
  "본점",
  "명동",
  "잠실",
  "강남",
  "센텀",
  "센텀시티",
  "광복",
  "울산",
  "대구",
  "동성로",
  "서면",
  "안산",
  "안양",
  "평촌",
  "일산",
  "수원",
  "부천",
  "영등포",
  "청량리",
  "중동",
  "노원",
  "창원",
  "부산",
  "해운대",
  "광주",
];

const VALID_REGIONS = [
  // 광역시
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",

  // 도 단위
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",

  // 주요 핫스팟 & 지명
  "성수",
  "홍대",
  "강남",
  "잠실",
  "건대",
  "명동",
  "삼성",
  "선릉",
  "압구정",
  "판교",
  "서면",
  "동성로",
  "광안리",
  "해운대",
  "여의도",
  "용산",
  "왕십리",
  "일산",
  "미아",
  "청담",
  "전주",
  "가산",
  "목동",
  "종로",
  "광화문",
  "신촌",
];

// 단독으로 location으로 쓸 수 있는 핫스팟
const HOT_SPOTS = [
  "성수",
  "홍대",
  "강남",
  "잠실",
  "건대",
  "명동",
  "삼성",
  "선릉",
  "압구정",
  "판교",
  "서면",
  "해운대",
  "광안리",
  "동성로",
  "여의도",
  "용산",
  "가산",
  "전주",
  "제주",
  "목동",
  "부산",
  "대구",
  "대전",
  "광주",
  "울산",
];

// location에서 절대 나오면 안 되는 금지어
const BAD_WORDS = [
  "전문",
  "가맹",
  "체험",
  "행사",
  "이벤트",
  "프로그램",
  "부스",
  "안내",
  "영업",
  "홍보",
  "특가",
  "프로모션",
  "스토어",
  "관",
  "센터",
  "점포",
  "입구",
  "매장",
  "홀",
  "기획",
  "팝업",
  "전시",
  "쇼룸",
  "카페",
];

// 지점명 패턴 ex) 강남점 → "강남"
const BRANCH_PATTERN = /([가-힣A-Za-z0-9]+)점/;

// ===============================
// 실제 location 추출 함수
// ===============================
export function extractPlaceName(text) {
  if (!text) return null;

  // 1) 브랜드 찾기
  const brandRaw = Object.keys(BRAND_MAP).find((b) => text.includes(b));
  const brand = brandRaw ? BRAND_MAP[brandRaw] : null;

  // 2) 지점(지역) 찾기
  let region = null;

  const branch = text.match(BRANCH_PATTERN);
  if (branch) {
    const rg = branch[1];
    if (VALID_REGIONS.includes(rg)) {
      region = rg;
    }
  }

  // 3) 브랜드 + 지역 → 완벽한 location
  if (brand && region) return `${brand} ${region}`;

  // 4) 브랜드만 있는 경우 (뒤에 이상한 단어 붙으면 제거)
  if (brand) return brand;

  // 5) 핫스팟만 있는 경우
  for (const spot of HOT_SPOTS) {
    if (text.includes(spot)) return spot;
  }

  // 6) 금지어 걸린 경우 제거
  for (const bad of BAD_WORDS) {
    if (text.includes(bad)) return null;
  }

  return null;
}
