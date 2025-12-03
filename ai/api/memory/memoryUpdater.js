import supabase from "../../chains/supabaseClient.js";
import { loadMemory, saveMemory } from "./memoryRepository.js";

export async function updateMemory(userId, newData) {
  // 1️⃣ 기존 메모리 불러오기 (DB에서)
  const memory = await loadMemory(userId);

  // 기본값 보장
  memory.travelHistory = memory.travelHistory || [];
  memory.preferences = memory.preferences || [];
  memory.intentHistory = memory.intentHistory || [];

  // 2️⃣ 새 여행 기록 구성
  const newRecord = {
    country: newData.country || null,
    city: newData.city || null,
    dateRange: newData.dateRange || null,
    companions: newData.companions || [],
    categories: newData.categories || [],
    brandOrKeyword: newData.brandOrKeyword || [],
    intent: newData.intent || null,
    count: 1,
  };

  // 3️⃣ 기존 데이터와 병합
  const existingIndex = memory.travelHistory.findIndex(
    (t) =>
      t.city === newRecord.city &&
      JSON.stringify(t.brandOrKeyword) ===
        JSON.stringify(newRecord.brandOrKeyword)
  );

  if (existingIndex !== -1) {
    // 🔹 이미 같은 도시/브랜드 존재 → count +1
    const existing = memory.travelHistory[existingIndex];
    existing.count = (existing.count || 1) + 1;
    existing.dateRange = newRecord.dateRange || existing.dateRange;
    existing.companions = Array.from(
      new Set([...existing.companions, ...newRecord.companions])
    );
    existing.categories = Array.from(
      new Set([...existing.categories, ...newRecord.categories])
    );
    existing.intent = newRecord.intent || existing.intent;
    memory.travelHistory[existingIndex] = existing;
  } else {
    // 🔹 새로운 여행 → 기존 배열에 push
    memory.travelHistory.push(newRecord);
  }

  // 4️⃣ 선호 카테고리 갱신
  for (const cat of newData.categories || []) {
    if (!memory.preferences.includes(cat)) memory.preferences.push(cat);
  }

  // 5️⃣ 의도 히스토리 추가
  if (newData.intent) memory.intentHistory.push(newData.intent);

  memory.lastUpdated = new Date().toISOString();

  // 6️⃣ ✅ DB의 기존 travel_history와 병합 후 저장
  // Supabase에서 다시 최신 travel_history 불러오기 (안정성)
  const { data: existingData } = await supabase
    .from("user_memory")
    .select("travel_history")
    .eq("user_id", userId)
    .single();

  const merged = existingData?.travel_history
    ? [...existingData.travel_history, ...memory.travelHistory].reduce(
        (acc, curr) => {
          const key = `${curr.city}-${curr.brandOrKeyword}`;
          const existing = acc.find(
            (i) => `${i.city}-${i.brandOrKeyword}` === key
          );
          if (existing) {
            existing.count = (existing.count || 1) + (curr.count || 1);
          } else {
            acc.push(curr);
          }
          return acc;
        },
        []
      )
    : memory.travelHistory;

  memory.travelHistory = merged;

  await saveMemory(memory);
  return memory;
}
