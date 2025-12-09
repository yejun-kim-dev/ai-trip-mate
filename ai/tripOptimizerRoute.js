import express from "express";
import { fetchUserTripItems } from "./services/tripService.js";
import { allocateDates } from "../utils/allocateDates.js";
import { optimizeDailyRoute } from "../utils/optimizeDailyRoute.js";
import { adjustByTime } from "../utils/timeAdjust.js";

const router = express.Router();

router.post("/optimize-trip", async (req, res) => {
  try {
    const { userId, tripStart, tripEnd } = req.body;

    const items = await fetchUserTripItems(userId, tripStart, tripEnd);

    const byDate = allocateDates(items, tripStart, tripEnd);

    const result = {};

    for (let date in byDate) {
      let optimized = optimizeDailyRoute(byDate[date]);
      optimized = adjustByTime(optimized);
      result[date] = optimized;
    }
    //---------------------------------------
    // ⭐ 여기서 규칙 기반 정렬 엔진 적용
    //---------------------------------------

    return res.json({ ok: true, route: result });
  } catch (err) {
    console.error("❌ optimize-trip error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router;
