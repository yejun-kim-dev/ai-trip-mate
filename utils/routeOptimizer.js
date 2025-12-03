// ai/utils/routeOptimizer.js

// 문자열 "HH:MM" -> 분 단위 number (예: "10:30" => 630)
function timeToMinutes(str, defaultMinutes) {
  if (!str) return defaultMinutes;
  const [h, m] = str.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return defaultMinutes;
  return h * 60 + m;
}

// 분 -> "HH:MM" 문자열
function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const hhStr = h.toString().padStart(2, "0");
  const mmStr = mm.toString().padStart(2, "0");
  return `${hhStr}:${mmStr}`;
}

// 대충 거리 계산 (하버사인) → km
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

// 거리(km) + 속도(km/h)로 이동 시간(분) 추정
function estimateTravelMinutes(a, b, speedKmh = 3) {
  const distKm = haversineKm(a, b);
  const hours = distKm / speedKmh;
  return Math.round(hours * 60);
}

/**
 * 하루치 팝업 동선 최적화
 * items: 같은 날짜(visit_date)인 user_trip_items 배열
 * 옵션:
 *   dayStart       : 하루 시작 시간 (분 단위, 기본 10:00 = 600분)
 *   defaultOpen    : open_time 없을 때 기본 오픈시간 (분)
 *   defaultClose   : close_time 없을 때 기본 마감시간 (분)
 *   stayMinutes    : 한 팝업에서 머무는 시간 (분)
 */
export function optimizeDayRoute(items, options = {}) {
  const {
    dayStart = 10 * 60, // 10:00
    defaultOpen = 10 * 60, // 10:00
    defaultClose = 22 * 60, // 22:00
    stayMinutes = 60, // 1시간
    speedKmh = 3,
  } = options;

  if (!items || items.length === 0) return [];

  const remaining = items.map((it) => ({ ...it }));
  const route = [];
  let current = null;
  let currentTime = dayStart;

  while (remaining.length > 0) {
    let bestIdx = -1;
    let bestScore = Infinity;
    let bestArrival = null;

    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i];

      // lat/lng 없으면 패스
      if (c.lat == null || c.lng == null) continue;

      const travelMinutes = current
        ? estimateTravelMinutes(
            { lat: current.lat, lng: current.lng },
            { lat: c.lat, lng: c.lng },
            speedKmh
          )
        : 0;

      let arrival = currentTime + travelMinutes;

      const open = timeToMinutes(c.open_time, defaultOpen);
      const close = timeToMinutes(c.close_time, defaultClose);

      if (arrival < open) {
        arrival = open; // 너무 일찍 도착하면 문 열릴 때까지 기다림
      }

      if (arrival > close) {
        // 이미 마감 시간 지나서 못 감
        continue;
      }

      // 점수: 도착 시간 + 이동 시간 약간 가중치
      const score = arrival + travelMinutes * 0.3;

      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
        bestArrival = arrival;
      }
    }

    if (bestIdx === -1) {
      // 더 이상 갈 수 있는 팝업이 없음
      break;
    }

    const next = remaining.splice(bestIdx, 1)[0];

    const startMinutes = bestArrival;
    const endMinutes = startMinutes + stayMinutes;

    route.push({
      ...next,
      _computed_start_minutes: startMinutes,
      _computed_end_minutes: endMinutes,
      expected_start_time: minutesToTime(startMinutes),
      expected_end_time: minutesToTime(endMinutes),
    });

    current = next;
    currentTime = endMinutes;
  }

  return route;
}

/**
 * 여러 날짜에 대해 동선 최적화
 * items: user_trip_items 전체 (여러 날짜 섞여있어도 됨)
 * return: [{ date: '2025-12-01', items: [...최적 순서...] }, ...]
 */
export function optimizeRouteByDate(items, options = {}) {
  // 1) 날짜별로 그룹핑
  const byDate = new Map();
  for (const item of items) {
    let date = item.visit_date || item.period_start || item.period_end;

    // ✅ 날짜 없으면 오늘 날짜 자동 부여
    if (!date) {
      const today = new Date().toISOString().slice(0, 10);
      date = today;
    }

    const key =
      typeof date === "string" ? date : date.toISOString().slice(0, 10);

    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(item);
  }

  // 2) 각 날짜별로 최적화 실행
  const result = [];

  for (const [date, list] of byDate.entries()) {
    const optimized = optimizeDayRoute(list, options);

    // 순서 번호 붙여주기
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

  // 날짜 오름차순 정렬
  result.sort((a, b) => (a.date < b.date ? -1 : 1));
  return result;
}
