import fetch from "node-fetch";

const MY_NEW_KEY = "AIzaSyDbbbJfCZZ1Pd1s44ADkFVceN3Hy5w4vXc";

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${MY_NEW_KEY}`;

async function run() {
  console.log("📡 모델 목록 호출 중...");

  const res = await fetch(url);
  const data = await res.json();

  console.log("📩 ListModels 결과:", JSON.stringify(data, null, 2));
}

run();
