import supabase from "../chains/supabaseClient.js";

/* ============================================================
   0. 사용자 일정 불러오기
============================================================ */
async function fetchUserTripItems(userId, tripStart, tripEnd) {
  const { data, error } = await supabase
    .from("user_trip_items")
    .select("*")
    .eq("user_id", userId)
    .lte("period_end", tripEnd)
    .gte("period_start", tripStart);

  if (error) {
    console.error("❌ Error fetching user_trip_items:", error);
    return [];
  }
  return data || [];
}

/* ============================================================
   1. 거리 기반 동선 최적화 (기존 기능 유지)
============================================================ */

// 1-1. 거리 계산
function distance(a, b) {
  const dx = (a.lat || 0) - (b.lat || 0);
  const dy = (a.lng || 0) - (b.lng || 0);
  return Math.sqrt(dx * dx + dy * dy);
}

// 1-2. 팝업 부분 최적화
function optimizeSegment(popups, start, end) {
  const points = [...popups];
  const result = [];
  let current;

  if (start) {
    current = start;
  } else {
    current = points.shift();
    if (!current) return [];
    result.push(current);
  }

  while (points.length > 0) {
    let nearestIndex = 0;
    let minDist = Infinity;

    for (let i = 0; i < points.length; i++) {
      const dist = distance(current, points[i]);
      if (dist < minDist) {
        minDist = dist;
        nearestIndex = i;
      }
    }

    current = points.splice(nearestIndex, 1)[0];
    result.push(current);
  }

  return result;
}

// 1-3. 고정 지점 포함 전체 최적화
function optimizeWithFixedStops(items) {
  items.sort((a, b) => (a.visit_order ?? 999) - (b.visit_order ?? 999));

  const result = [];
  let buffer = [];
  let prevFixed = null;

  for (const item of items) {
    if (item.category === "food" || item.category === "lodging") {
      if (buffer.length > 0) {
        const optimized = optimizeSegment(buffer, prevFixed, item);
        result.push(...optimized);
        buffer = [];
      }
      result.push(item);
      prevFixed = item;
    } else {
      buffer.push(item);
    }
  }

  if (buffer.length > 0) {
    const optimized = optimizeSegment(buffer, prevFixed, null);
    result.push(...optimized);
  }

  return result;
}

/* ============================================================
   2. 새 일정 엔진 — 식당/팝업 균등분배 + 마지막날 숙소 제외
============================================================ */

// 2-1. 균등 분배
function distributeEvenly(items, totalDays) {
  const total = items.length;
  const base = Math.floor(total / totalDays);
  let remainder = total % totalDays;

  const result = {};
  let index = 0;

  for (let day = 1; day <= totalDays; day++) {
    const count = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;

    result[day] = items.slice(index, index + count);
    index += count;
  }

  return result;
}

// 2-2. 식당 + 팝업 섞기
function mergeRestaurantsAndPopups(restaurants, popups) {
  const result = [];
  let r = 0;
  let p = 0;

  while (r < restaurants.length || p < popups.length) {
    if (r < restaurants.length) result.push(restaurants[r++]);
    if (p < popups.length) result.push(popups[p++]);
  }

  return result;
}

// 2-3. 숙소 배치 (마지막 날 제외)
function placeHotels(finalSchedule, hotels, totalDays) {
  const usableDays = totalDays - 1;

  for (let day = 1; day <= usableDays; day++) {
    if (hotels.length > 0) {
      finalSchedule[day].push(hotels.shift());
    }
  }
}

// 2-4. 최종 일정 엔진 (distance 결과를 이용)
function buildFinalTrip(
  optimizedItems,
  dummyRestaurants,
  dummyHotels,
  totalDays
) {
  // 1) 카테고리 분류
  const restaurants = dummyRestaurants;
  const hotels = dummyHotels;
  const popups = optimizedItems.filter(
    (i) => i.category !== "식당" && i.category !== "숙박"
  );

  // 2) 팝업 균등 분배
  const popupByDay = distributeEvenly(popups, totalDays);

  // 3) 식당 균등 분배
  const restaurantByDay = distributeEvenly(restaurants, totalDays);

  // 4) 최종 스케줄 초기화
  const final = {};
  for (let d = 1; d <= totalDays; d++) final[d] = [];

  // 5) “식당 → 팝업 → 식당 → 팝업” 방식으로 병합
  for (let day = 1; day <= totalDays; day++) {
    const merged = [];
    const r = restaurantByDay[day] || [];
    const p = popupByDay[day] || [];

    let ri = 0;
    let pi = 0;

    while (ri < r.length || pi < p.length) {
      if (ri < r.length) merged.push(r[ri++]);
      if (pi < p.length) merged.push(p[pi++]);
    }

    final[day] = merged;
  }

  // 6) 숙박 배치 (마지막 날 제외)
  for (let day = 1; day < totalDays; day++) {
    if (hotels[day - 1]) final[day].push(hotels[day - 1]);
  }

  return final;
}

/* ============================================================
   ⭐ 최종 Export
============================================================ */
export { fetchUserTripItems, optimizeWithFixedStops, buildFinalTrip };
