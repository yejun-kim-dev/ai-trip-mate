// ai/chains/logUserRequest.js
import { supabase } from "./supabaseClient.js";

export async function logUserRequest(userId, message, region) {
  try {
    const { data, error } = await supabase.from("user_request_history").insert([
      {
        user_id: userId,
        request_text: message,
        region: region || null,
      },
    ]);

    if (error) {
      console.error("❌ 요청 기록 저장 실패:", error);
    } else {
      console.log("✅ 요청 기록 저장 완료:", data);
    }
  } catch (err) {
    console.error("❌ logUserRequest 내부 오류:", err);
  }
}
