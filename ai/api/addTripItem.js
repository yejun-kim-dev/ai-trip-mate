import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function addTripItem(req, res) {
  try {
    const { userId, tripId, selectedPopupIds, visitDate } = req.body;

    if (!userId || !tripId || !visitDate) {
      return res.status(400).json({ ok: false, error: "필수 값 누락됨" });
    }

    // 1) 기존 날짜 일정 삭제
    await supabase
      .from("user_trip_items")
      .delete()
      .eq("user_id", userId)
      .eq("trip_id", tripId)
      .eq("visit_date", visitDate);

    // 2) 새 일정 삽입
    const rows = selectedPopupIds.map((popupId, index) => ({
      user_id: userId,
      trip_id: tripId,
      popup_id: popupId,
      visit_date: visitDate,
      visit_order: index + 1,
    }));

    const { error } = await supabase.from("user_trip_items").insert(rows);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, count: rows.length });

  } catch (err) {
    console.error("❌ addTripItem error:", err);
    return res.status(500).json({ ok: false, error: "서버 오류 발생" });
  }
}
