import * as chrono from "chrono-node";
import { formatPopupResponse } from "./utils/formatPopupResponse.js";

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "메시지가 없습니다." });

    const parsed = chrono.parse(message);
    let startDate = null;
    let endDate = null;

    if (parsed.length >= 2) {
      startDate = chrono.parseDate(parsed[0].text);
      endDate = chrono.parseDate(parsed[1].text);
    } else if (parsed.length === 1) {
      startDate = chrono.parseDate(parsed[0].text);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 2);
    }

    if (!startDate || !endDate) {
      startDate = new Date();
      endDate = new Date();
      endDate.setDate(startDate.getDate() + 2);
    }

    const regionMatch = message.match(
      /(서울|부산|대구|대전|광주|인천|제주|수원|울산)/
    );
    const region = regionMatch ? regionMatch[0] : "전국";

    // ✅ 여기만 추가된 부분
    const BASE = process.env.PUBLIC_HOST || "http://localhost:1000";

    const popResp = await fetch(`${BASE}/api/popups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
      }),
    });

    const { popups } = await popResp.json();

    const reply = formatPopupResponse(popups, region);

    return res.json({ reply });
  } catch (err) {
    console.error("❌ Chat Route Error:", err);
    res.status(500).json({ error: "서버 내부 오류" });
  }
});
