// ai/test-langchain.js
import dotenv from "dotenv";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { createConversationChain } from "./chains/conversationChain.js";

async function test() {
  const userId = "user002";
  const chain = await createConversationChain(userId);

  const result = await chain.invoke({
    prompt: "오늘 성수에서 볼만한 팝업 추천해줘",
  });

  console.log(result);
}

test();
