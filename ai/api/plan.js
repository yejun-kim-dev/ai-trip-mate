export default function handler(req, res) {
  const { dest, days } = req.query;

  const plans = [
    `1일차: ${dest} 도착 및 관광 시작`,
    `2일차: ${dest} 명소 탐방`,
    `3일차: 맛집 투어`,
    `4일차: 쇼핑 및 귀국 준비`,
  ];

  const result = {
    plan: plans.slice(0, days).join("\n"),
  };

  res.status(200).json(result);
}
