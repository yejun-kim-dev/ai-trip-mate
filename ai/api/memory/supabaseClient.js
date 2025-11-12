import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// 👇 경로를 명시적으로 지정 (루트 경로의 .env를 불러옴)
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
