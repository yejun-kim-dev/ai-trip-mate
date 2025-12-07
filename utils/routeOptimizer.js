// =====================
// 시간 관련 유틸
// =====================

// 문자열 "HH:MM" -> 분 단위 number (예: "10:30" => 630)
function timeToMinutes(str, defaultMinutes = 600) {
  if (!str) return defaultMinutes;
  const [h, m] = str.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return defaultMinutes;
  return h * 60 + m;
}

// 분 -> "HH:MM" 문자열
function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// =====================
// 거리 계산
// =====================

// 하버사인 거리 계산 (km)
function haversineKm(a, b) {
  const R = 6371; // 지구 반지름 km
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const aa =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));

  return R * c;
}

// 거리 기반 이동 시간(분)
function estimateTravelMinutes(a, b, speedKmh = 3) {
  const distKm = haversineKm(a, b);
  const hours = distKm / speedKmh;
  return Math.round(hours * 60);
}

// =====================
// 거리 기반 정렬 (카테고리 내부용)
// =====================
function sortByDistance(list) {
  if (!list || list.length <= 1) return list;

  const sorted = [list[0]];
  const remain = list.slice(1);

  while (remain.length > 0) {
    const last = sorted[sorted.length - 1];

    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < remain.length; i++) {
      const dist = haversineKm(last, remain[i]);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    sorted.push(remain.splice(bestIdx, 1)[0]);
  }

  return sorted;
}

// =====================
// 하루 일정 최적화
// =====================
export function optimizeDayRoute(items, options = {}) {
  const {
    dayStart = 10 * 60, // 10:00 시작
    stayMinutes = 60,
    speedKmh = 3,
  } = options;

  if (!items || items.length === 0) return [];

  // 1) 카테고리 구분
  const hotels = items.filter((it) => it.category === "숙박");
  const foods = items.filter((it) => it.category === "식당");
  const others = items.filter(
    (it) => it.category !== "식당" && it.category !== "숙박"
  );

  // 숙박은 하루 마지막 1개만 사용
  const hotel = hotels.length > 0 ? hotels[0] : null;

  // 카테고리별 정렬
  const sortedFoods = sortByDistance(foods);
  const sortedOthers = sortByDistance(others);

  // 2) 식당 → others → 식당 → others 로 번갈아 구성
  const route = [];
  let fi = 0;
  let oi = 0;

  while (fi < sortedFoods.length || oi < sortedOthers.length) {
    if (fi < sortedFoods.length) {
      route.push(sortedFoods[fi]);
      fi++;
    }
    if (oi < sortedOthers.length) {
      route.push(sortedOthers[oi]);
      oi++;
    }
  }

  // 3) 마지막에 숙소 추가
  if (hotel) route.push(hotel);

  // 4) 시간 계산 (필터링 없음)
  let currentTime = dayStart;
  let current = null;

  const result = [];

  for (const r of route) {
    const travelMinutes = current
      ? estimateTravelMinutes(
          { lat: current.lat, lng: current.lng },
          { lat: r.lat, lng: r.lng },
          speedKmh
        )
      : 0;

    const start = currentTime + travelMinutes;
    const end = start + stayMinutes;

    result.push({
      ...r,
      _computed_start_minutes: start,
      _computed_end_minutes: end,
      expected_start_time: minutesToTime(start),
      expected_end_time: minutesToTime(end),
    });

    current = r;
    currentTime = end;
  }

  return result;
}

// =====================
// 여러 날짜 일정 최적화
// =====================
export function optimizeRouteByDate(items, options = {}) {
  const byDate = new Map();

  // 날짜별 그룹화
  for (const item of items) {
    let date = item.visit_date || item.period_start || item.period_end;

    if (!date) date = new Date().toISOString().slice(0, 10);

    const key =
      typeof date === "string" ? date : date.toISOString().slice(0, 10);

    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(item);
  }

  const result = [];

  // 날짜별 최적화 실행
  for (const [date, list] of byDate.entries()) {
    const optimized = optimizeDayRoute(list, options);

    const withOrder = optimized.map((it, idx) => ({
      ...it,
      visit_order: idx + 1,
      visit_date: date,
    }));

    result.push({
      date,
      items: withOrder,
    });
  }

  // 날짜 정렬
  result.sort((a, b) => (a.date < b.date ? -1 : 1));

  return result;
}
