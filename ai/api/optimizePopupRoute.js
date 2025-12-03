import express from "express";
import { calcDistance } from "../../utils/calcDistance.js";
import supabase from "../chains/supabaseClient.js";

const router = express.Router();

router.get("/trips/:tripId/optimize-popup", async (req, res) => {
  const { tripId } = req.params;

  try {
    const { data, error } = await supabase
      .from("user_trip_items")
      .select("*")
      .eq("trip_id", tripId)
      .eq("category", "popup");

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.json({ message: "팝업 없음", optimized: [] });
    }

    const baseLat = data[0].lat;
    const baseLng = data[0].lng;

    const enriched = data.map((item) => {
      const distance = calcDistance(baseLat, baseLng, item.lat, item.lng);

      const visitTime = item.visit_time;
      const possible =
        visitTime >= item.open_time && visitTime <= item.close_time;

      return {
        ...item,
        distance,
        possible,
      };
    });

    const sorted = enriched.sort((a, b) => {
      if (a.possible !== b.possible) {
        return b.possible - a.possible;
      }
      return a.distance - b.distance;
    });

    res.json({
      count: sorted.length,
      optimized: sorted,
    });
  } catch (err) {
    console.error("❌ 최적화 에러:", err);
    res.status(500).json({ error: "최적화 실패" });
  }
});

export default router;
