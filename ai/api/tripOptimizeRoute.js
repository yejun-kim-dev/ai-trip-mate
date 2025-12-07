// src/ai/api/tripOptimizeRoute.js
import express from "express";
import { fetchUserTripItems } from "./services/tripService.js";
import { allocateDates } from "../utils/allocateDates.js";
import { strToDate, dateToStr } from "../utils/dateUtils.js";

const router = express.Router();

/** 카테고리 헬퍼 */
const IS_POPUP = (item) => item.category === "관광";
const IS_FOOD = (item) => item.category === "식당";
const IS_HOTEL = (item) => item.category === "숙박";

/** 2박 3일용 날짜 리스트 만들기 */
function buildThreeDays(tripStart) {
  const start = strToDate(tripStart);
  const days = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(dateToStr(d)); // "2025-12-24" 같은 문자열
  }
  return days;
}

/** 식당과 팝업을 섞어서 하나의 하루 리스트로 만들기 */
function mergeRestaurantsAndPopups(restaurants, popups) {
  const result = [];
  let r = 0;
  let p = 0;

  // 간단한 규칙:
  // 식당 하나 → 팝업 하나 → 팝업 하나 → 식당 하나 → 팝업 하나 → ...
  while (r < restaurants.length || p < popups.length) {
    if (r < restaurants.length) {
      result.push(restaurants[r++]);
    }
    if (p < popups.length) {
      result.push(popups[p++]);
    }
    if (p < popups.length) {
      result.push(popups[p++]);
    }
  }

  // 남은 팝업이 있으면 뒤에 붙이기
  while (p < popups.length) {
    result.push(popups[p++]);
  }

  return result;
}

/** 하루 리스트에 visit_order랑 visit_date 달아주기 */
function applyVisitOrderAndDate(list, dateStr) {
  return list.map((item, idx) => ({
    ...item,
    visit_date: dateStr,
    visit_order: idx + 1,
  }));
}

router.post("/optimize-trip", async (req, res) => {
  try {
    const { userId, tripStart, tripEnd } = req.body;

    // 시연용: 무조건 2박 3일이라고 가정
    const days = buildThreeDays(tripStart); // [day1, day2, day3]
    const firstDay = days[0];
    const lastDay = days[2];

    // 1. DB에서 전체 아이템 가져오기
    const items = await fetchUserTripItems(userId, tripStart, tripEnd);

    // 2. 카테고리별로 분리
    const popups = items.filter(IS_POPUP);
    const foods = items.filter(IS_FOOD);
    const hotels = items.filter(IS_HOTEL);

    // 3. 팝업을 날짜별로 균등 분배 (period_start/period_end 범위 고려)
    const popupByDate = allocateDates(popups, tripStart, tripEnd);

    // 4. 식당/숙박은 기존 visit_date 기준으로 날짜별 분리
    const foodByDate = {};
    const hotelByDate = {};

    for (const day of days) {
      foodByDate[day] = [];
      hotelByDate[day] = [];
    }

    for (const f of foods) {
      const d = f.visit_date || firstDay; // visit_date가 없으면 첫째날로
      if (!foodByDate[d]) foodByDate[d] = [];
      foodByDate[d].push(f);
    }

    for (const h of hotels) {
      const d = h.visit_date || firstDay;
      if (!hotelByDate[d]) hotelByDate[d] = [];
      hotelByDate[d].push(h);
    }

    // 5. 날짜별 최종 스케줄 구성
    const route = {};

    for (const day of days) {
      const dayFoods = foodByDate[day] || [];
      const dayPopups = popupByDate[day] || [];
      const dayHotels = hotelByDate[day] || [];

      // 5-1. 식당 + 팝업 섞기
      let dayList = mergeRestaurantsAndPopups(dayFoods, dayPopups);

      // 5-2. 숙박은 항상 마지막 (마지막 날은 시연용으로 제외하고 싶으면 조건)
      if (day !== lastDay) {
        for (const h of dayHotels) {
          dayList.push(h);
        }
      }

      // 5-3. visit_order, visit_date 세팅
      route[day] = applyVisitOrderAndDate(dayList, day);
    }

    return res.json({ ok: true, route });
  } catch (err) {
    console.error("❌ optimize-trip error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router;
