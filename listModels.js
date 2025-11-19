import fetch from "node-fetch";
import "dotenv/config";

const url =
  "https://generativelanguage.googleapis.com/v1beta/models?key=" +
  process.env.GEMINI_API_KEY;

const res = await fetch(url);
const data = await res.json();

console.log("🔥 사용 가능한 모델 목록 ↓");
console.log(JSON.stringify(data, null, 2));
