// ai/api/getTripItems.js

import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/get-trip-items
router.post("/", async (req, res) => {
  try {
    const { userId, tripId } = req.body;

    if (!userId || !tripId) {
      return res
        .status(400)
        .json({ ok: false, error: "userId, tripId가 필요합니다." });
    }

    console.log("👉 /api/get-trip-items 요청:", { userId, tripId });

    const { data, error } = await supabase
      .from("user_trip_items")
    .select("id, popup_id, trip_id, user_id, visit_date, visit_order")
    .eq("user_id", userId)
    .eq("trip_id", tripId)
    .order("visit_order", { ascending: true });

    if (error) {
      console.error("❌ Supabase query error (get-trip-items):", error);
      return res
        .status(500)
        .json({ ok: false, error: "Supabase query error" });
    }

    console.log("📦 조회된 일정 데이터:", data);

    return res.json({ ok: true, items: data || [] });
  } catch (err) {
    console.error("❌ /api/get-trip-items fatal error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;
