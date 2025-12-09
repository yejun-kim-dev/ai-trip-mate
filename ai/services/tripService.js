import supabase from "../chains/supabaseClient.js";

/* ============================================================
   📍 [유틸] 주소/이름으로 좌표 찾는 함수 (지오코딩)
   - OpenStreetMap(무료) 사용
============================================================ */
async function getCoordinates(query) {
  if (!query) return null;
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MyTripApp/1.0" },
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.warn(`⚠️ 좌표 변환 실패: ${query}`);
  }
  return null;
}

/* ============================================================
   0. 사용자 일정 불러오기 (데이터 보정 강화판)
============================================================ */
async function fetchUserTripItems(userId, tripStart, tripEnd, tripId) {
  // 🔥 tripId 파라미터 추가
  console.log(`🔍 DB 조회 조건: User=${userId}, Trip=${tripId}`);

  // 1. DB 데이터 가져오기
  // 🔥 [핵심] .eq("trip_id", tripId) 를 추가해서 현재 여행의 장소만 가져옵니다.
  let query = supabase
    .from("user_trip_items")
    .select("*")
    .eq("user_id", userId);

  // tripId가 유효하게 넘어왔을 때만 필터링 (안전장치)
  if (tripId) {
    query = query.eq("trip_id", tripId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error fetching user_trip_items:", error);
    return [];
  }

  console.log(`📦 DB에서 찾아낸 아이템 개수: ${data?.length || 0}개`);

  if (!data || data.length === 0) return [];

  // 2. 데이터 보정 (날짜/좌표/카테고리 채워주기)
  const processedData = await Promise.all(
    data.map(async (item) => {
      const popup = item; // 더 이상 popups 조인 안 함

      // --- [1] 날짜 파싱 및 기본값 처리 ---
      let pStart = null;
      let pEnd = null;

      if (popup.period) {
        const parts = popup.period.split("~");
        if (parts[0]) pStart = parts[0].trim().replace(/\./g, "-");
        if (parts[1]) pEnd = parts[1].trim().replace(/\./g, "-");
      }

      // 🔥 [핵심] 기간 정보가 없거나 이상하면, '여행 전체 기간' 동안 가능한 것으로 설정
      // 이렇게 해야 AI가 "날짜가 안 맞네?" 하고 버리는 것을 막습니다.
      if (!pStart) pStart = tripStart;
      if (!pEnd) pEnd = tripEnd;

      // --- [2] 좌표 확보 ---
      let lat = 0;
      let lng = 0;
      let searchResult = null;

      if (popup.location) searchResult = await getCoordinates(popup.location);
      if (!searchResult && popup.name)
        searchResult = await getCoordinates(popup.name);

      if (searchResult) {
        lat = searchResult.lat;
        lng = searchResult.lng;
      } else {
        // 검색 실패 시 기본 좌표 (부산 시청) - 에러 방지용
        lat = 35.1795543;
        lng = 129.0756416;
      }

      // --- [3] 카테고리 보정 ---
      // 카테고리가 없으면 '관광'으로 처리하여 로직에 포함되게 함
      const category = popup.category || "관광";

      return {
        trip_id: item.trip_id,
        visit_date: item.visit_date,
        visit_order: item.visit_order,

        id: popup.id,
        title: popup.name || "장소명 없음",
        category: category,

        lat: lat,
        lng: lng,

        period_start: pStart,
        period_end: pEnd,

        period: popup.period,
        location: popup.location || "위치 정보 없음",
      };
    })
  );

  return processedData;
}

/* ============================================================
   1. 거리 기반 동선 최적화
============================================================ */

function distance(a, b) {
  const dx = (a.lat || 0) - (b.lat || 0);
  const dy = (a.lng || 0) - (b.lng || 0);
  return Math.sqrt(dx * dx + dy * dy);
}

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

function optimizeWithFixedStops(items) {
  items.sort((a, b) => (a.visit_order ?? 999) - (b.visit_order ?? 999));

  const result = [];
  let buffer = [];
  let prevFixed = null;

  for (const item of items) {
    if (item.category === "식당" || item.category === "숙박") {
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
   3. 내 여행 목록 가져오기 (Home 화면용) - 수정됨
============================================================ */
async function fetchMyTrips(userId) {
  // 🔥 [디버깅] 요청받은 userId가 뭔지 확인
  console.log(`[Service] fetchMyTrips 호출됨. 요청 ID: "${userId}"`);

  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", userId) // DB의 user_id 컬럼과 비교
    .order("start_date", { ascending: true });

  if (error) {
    console.error("❌ [Service] DB 조회 에러:", error);
    return [];
  }

  // 🔥 [디버깅] 몇 개 찾았는지 확인
  console.log(`[Service] 찾은 여행 개수: ${data ? data.length : 0}개`);

  return data || [];
}

// export 수정
export { fetchUserTripItems, optimizeWithFixedStops, fetchMyTrips };
