import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ESM 환경에서 __dirname 만들기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ 여기 중요: 루트에 있는 .env를 정확히 지정
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

console.log("🔍 SUPABASE_URL:", process.env.SUPABASE_URL);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("❌ .env 환경변수(SUPABASE_URL, SERVICE_ROLE_KEY) 못 읽음");
}

const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
