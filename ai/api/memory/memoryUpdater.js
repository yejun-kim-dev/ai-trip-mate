import supabase from "../../chains/supabaseClient.js";
import { loadMemory, saveMemory } from "./memoryRepository.js";

export async function updateMemory(userId, newData) {
  // 1️⃣ 기존 메모리 불러오기 (DB에서)
  const memory = await loadMemory(userId);

  // 🔥 안전한 배열 초기화 (push 오류 방지)
  memory.travelHistory = Array.isArray(memory.travelHistory)
    ? memory.travelHistory
    : [];

  memory.preferences = Array.isArray(memory.preferences)
    ? memory.preferences
    : [];

  memory.intentHistory = Array.isArray(memory.intentHistory)
    ? memory.intentHistory
    : [];

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


  // 3️⃣ 기존 데이터와 병합 (메모리 상에서 처리)
  const existingIndex = memory.travelHistory.findIndex(
    (t) =>
      t.city === newRecord.city &&
      JSON.stringify(t.brandOrKeyword) ===
        JSON.stringify(newRecord.brandOrKeyword)
  );

  if (existingIndex !== -1) {
    // 🔹 이미 같은 도시/브랜드 존재 → count +1
    const existing = memory.travelHistory[existingIndex];
    existing.count = (existing.count || 1) + 1; // 여기서 이미 카운트 증가됨
    
    // 날짜 및 기타 정보 업데이트
    existing.dateRange = newRecord.dateRange || existing.dateRange;
    existing.companions = Array.from(
      new Set([...(existing.companions || []), ...newRecord.companions])
    );
    existing.categories = Array.from(
      new Set([...(existing.categories || []), ...newRecord.categories])
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

  // 6️⃣ ✅ 저장 (복잡한 재병합 로직 제거)
  // 이유: 1번 단계에서 DB 데이터를 이미 가져왔고, 3번에서 최신화했습니다.
  // 6번에서 또 DB를 불러와 합치면, 카운트가 2배로 뻥튀기되거나 로직이 꼬입니다.
  // 그냥 지금 메모리 상태를 저장하는 것이 가장 정확합니다.
  
  await saveMemory(memory);
  return memory;
}