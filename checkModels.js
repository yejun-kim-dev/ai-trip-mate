import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const main = async () => {
  const models = await client.listModels();
  console.log("=== 사용 가능한 모델 목록 ===");
  models.models.forEach((m) => console.log("-", m.name));
};

main();
