import supabase from "../chains/supabaseClient.js";

// ================================
// 🔹 1. 사용자 일정 데이터 불러오기
// ================================
export async function fetchUserTripItems(userId, tripStart, tripEnd) {
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

// ================================
// 🔹 2. 거리 계산 함수
// ================================
function distance(a, b) {
  const dx = a.lat - b.lat;
  const dy = a.lng - b.lng;
  return Math.sqrt(dx * dx + dy * dy);
}

// ================================
// 🔹 3. 특정 구간(popup들만) 최적화
// ================================
function optimizeSegment(popups, start, end) {
  const points = [...popups];
  const result = [];

  let current;

  // 시작이 있으면 기준점을 start로 사용
  if (start) {
    current = start;
  } else {
    current = points.shift(); // start 없으면 첫 팝업이 기준
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

// ================================
// 🔹 4. 고정지점 포함 전체 최적화
// ================================
function optimizeWithFixedStops(items) {
  // 일단 현재 순서대로 정렬
  items.sort((a, b) => (a.visit_order ?? 999) - (b.visit_order ?? 999));

  const result = [];
  let buffer = []; // popup 저장용 임시 공간
  let prevFixed = null; // 이전 고정 지점

  for (const item of items) {
    // ✅ 고정 장소 (식당 / 숙소)
    if (item.category === "food" || item.category === "lodging") {
      if (buffer.length > 0) {
        const optimized = optimizeSegment(buffer, prevFixed, item);
        result.push(...optimized);
        buffer = [];
      }

      result.push(item);
      prevFixed = item;
    } else {
      // ✅ popup, 전시, 축제 등 최적화 대상
      buffer.push(item);
    }
  }

  // 마지막에 남은 popup 처리
  if (buffer.length > 0) {
    const optimized = optimizeSegment(buffer, prevFixed, null);
    result.push(...optimized);
  }

  return result;
}

// ================================
// 🔹 5. 날짜 단위 동선 최적화
// ================================
export async function optimizeTripByDate(userId, date) {
  const { data: items, error } = await supabase
    .from("user_trip_items")
    .select("*")
    .eq("user_id", userId)
    .eq("visit_date", date);

  if (error) {
    console.error("❌ Error fetching data for optimization:", error);
    throw error;
  }

  if (!items || items.length === 0) {
    return [];
  }

  console.log(`📅 ${date} 최적화 대상 개수:`, items.length);

  const optimizedSchedule = optimizeWithFixedStops(items);

  // ✅ 최종 order 업데이트
  for (let i = 0; i < optimizedSchedule.length; i++) {
    const item = optimizedSchedule[i];

    await supabase
      .from("user_trip_items")
      .update({ visit_order: i + 1 })
      .eq("id", item.id);
  }

  return optimizedSchedule;
}

// ================================
// 🔹 6. 여러 날짜 한꺼번에 최적화
// ================================
export async function optimizeMultipleDays(userId, dates) {
  const results = [];

  for (const date of dates) {
    const optimized = await optimizeTripByDate(userId, date);
    results.push({
      date,
      optimizedCount: optimized.length,
    });
  }

  return results;
}
