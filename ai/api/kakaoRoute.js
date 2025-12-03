import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/restaurants", async (req, res) => {
  const { lat, lng } = req.query;
  console.log("🔥 카카오 키 확인:", process.env.KAKAO_REST_API_KEY);

  try {
    const response = await axios.get(
      "https://dapi.kakao.com/v2/local/search/category.json",
      {
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
        },
        params: {
          category_group_code: "FD6",
          x: lng,
          y: lat,
          radius: 1000,
          size: 10,
          sort: "distance",
        },
      }
    );

    return res.json(response.data.documents);
  } catch (err) {
    console.error("Kakao API error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Kakao API failed" });
  }
});

export default router;
