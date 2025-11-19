import fetch from "node-fetch";
import "dotenv/config";

const url =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" +
  process.env.GEMINI_API_KEY;

const body = {
  contents: [{ parts: [{ text: "안녕! 응답 테스트 중" }] }],
};

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

console.log(await res.json());
