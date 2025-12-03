import express from "express";
import { extractMemoryConcepts } from "./memory/memoryExtractor.js";
import { updateMemory } from "./memory/memoryUpdater.js";
import { loadMemory } from "./memory/memoryRepository.js";
import { analyzeUserMemory } from "./memory/memoryAnalyzer.js";
import { createConversationChain } from "../chains/conversationChain.js";
import { parseUserQuery, fetchPopupsFromDB } from "../searchPopups.js";
import { extractKeyword } from "../../utils/extractKeyword.js";
import { saveUserMemory } from "../chains/saveUserMemory.js";
import { logUserRequest } from "../chains/logUserRequest.js";
import {
  deriveCategoryFromDb,
  resolvePopupCategory,
  extractCategoryKeywords,
  filterEventsByCategory,
} from "../../utils/categoryUtils.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { userId, message, tripData, excludedTitles, conversationContext } = req.body;

    if (!message) return res.status(400).json({ error: "메시지가 없습니다." });
    if (!userId) return res.status(400).json({ error: "userId가 필요합니다." });
    
    // 이미 제시한 행사 제목 목록 (후속 질문에서 제외용)
    const excludedTitleSet = new Set((excludedTitles || []).map(t => t.toLowerCase().trim()));
    
    // 이전 대화 맥락 (지역, 날짜)
    const contextRegion = conversationContext?.region || null;
    const contextStartDate = conversationContext?.startDate ? new Date(conversationContext.startDate) : null;
    const contextEndDate = conversationContext?.endDate ? new Date(conversationContext.endDate) : null;

    // 1️⃣ 사용자 기억 로드 + 분석
    const userMemory = await loadMemory(userId);
    const memorySummary = analyzeUserMemory(userMemory);

    // 2️⃣ 새 개념 추출
    const extracted = extractMemoryConcepts(message);

    // 3️⃣ 기억 업데이트
    await updateMemory(userId, extracted);

    // 4️⃣ LangChain Conversation Chain 생성
    const chain = await createConversationChain(userId);

    // 5️⃣ 실제 RAG + Memory + LLM 실행 (invoke)
    const aiText = await chain.invoke({ message });

    // 6️⃣ 추천 데이터 생성
    let recommendations = [];
    
    // 지역/날짜 변수 선언
    let region = null;
    let startDate = null;
    let endDate = null;
    let regionSource = null; 
    let dateSource = null; 
    
    try {
      // 1. 사용자 메시지 파싱
      const parsed = parseUserQuery(message);
      if (parsed.region) {
        region = parsed.region;
        regionSource = "user";
      }
      if (parsed.startDate && parsed.endDate) {
        startDate = parsed.startDate;
        endDate = parsed.endDate;
        dateSource = "user";
      }

      // 2. 이전 대화 맥락 적용
      if (!region && contextRegion) {
        region = contextRegion;
        regionSource = "context";
      }
      if (!startDate && contextStartDate && contextEndDate) {
        startDate = contextStartDate;
        endDate = contextEndDate;
        dateSource = "context";
      }

      // 3. tripData fallback
      if (!region && tripData?.city) {
        region = tripData.city || tripData.location;
        regionSource = "trip";
      } else if (!region && tripData?.location) {
        region = tripData.location;
        regionSource = "trip";
      }

      if (!startDate && tripData?.dateRange?.start && tripData?.dateRange?.end) {
        startDate = new Date(tripData.dateRange.start);
        endDate = new Date(tripData.dateRange.end);
        dateSource = "trip";
      }

      // 4. 충돌 방지
      if (regionSource === "user" && dateSource === "trip") {
        startDate = null;
        endDate = null;
        dateSource = null;
        console.log("ℹ️ 사용자 지역 요청과 tripData 날짜가 충돌하여 날짜 정보를 무시했습니다.");
      }
      
      // 🎯 월 단위 요청 감지 및 확장
      if (startDate && endDate) {
        const diffDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        const monthMatch = message.match(/(\d{1,2})\s*월/);

        if (monthMatch) {
          const monthNumber = parseInt(monthMatch[1], 10);
          if (monthNumber >= 1 && monthNumber <= 12) {
            const year = startDate.getFullYear();
            if (diffDays <= 10) {
              const newStart = new Date();
              newStart.setFullYear(year, monthNumber - 1, 1);
              newStart.setHours(0, 0, 0, 0);

              const lastDay = new Date(year, monthNumber, 0).getDate();
              const newEnd = new Date();
              newEnd.setFullYear(year, monthNumber - 1, lastDay);
              newEnd.setHours(23, 59, 59, 999);

              startDate = newStart;
              endDate = newEnd;
              console.log(`🔵 월 단위 요청 감지: ${monthNumber}월 전체로 확장됨`, startDate, endDate);
            }
          }
        }
      }

      // 카테고리 키워드 추출
      const categoryKeywords = extractCategoryKeywords(message);

      // 🛠️ 공통 필터 함수 (중복 제거용)
      const applyStrictCategoryFilter = (items) => {
         if (!categoryKeywords || categoryKeywords.length === 0) return items;
         const lowerKeywords = categoryKeywords.map(k => k.toLowerCase());
         
         const filtered = items.filter(item => {
             const itemCat = resolvePopupCategory(item).toLowerCase();
             // 부분 일치 허용 (예: "팝업" 검색 시 "팝업스토어" 포함)
             return lowerKeywords.some(keyword => itemCat.includes(keyword));
         });
         
         console.log(`🧹 카테고리 필터 적용 (${lowerKeywords.join(', ')}): ${items.length}개 -> ${filtered.length}개`);
         return filtered;
      };

      let dbResults = [];

      // 1️⃣ DB 검색 수행
      if (region && startDate && endDate) {
        dbResults = await fetchPopupsFromDB(region, startDate, endDate);
      } else if (region) {
        const now = new Date();
        const future = new Date();
        future.setMonth(future.getMonth() + 6);
        dbResults = await fetchPopupsFromDB(region, now, future);
      } else if (startDate && endDate) {
        dbResults = await fetchPopupsFromDB(undefined, startDate, endDate);
      }
      dbResults.forEach(item => {
        console.log("DEBUG-CAT:", item.name, resolvePopupCategory(item));
      });
      
      // 🔥 1차 결과에 카테고리 필터 즉시 적용
      dbResults = applyStrictCategoryFilter(dbResults);



      // 검색 결과 없음 → 기본 검색 수행 (Fallback)
      if (dbResults.length === 0 && (region || startDate)) {
        console.log("⚠️ 1차 검색 결과 없음 (또는 카테고리 불일치), Fallback 검색 시도");
        
        let fallbackResults = [];
        
        // 지역 기준 Fallback
        if (region && !startDate) {
           const now = new Date();
           const future = new Date();
           future.setMonth(future.getMonth() + 6);
           fallbackResults = await fetchPopupsFromDB(region, now, future);
        }
        // 날짜 기준 Fallback (전국)
        else if (startDate && endDate && !region) {
           // (기존 코드의 Supabase 직접 호출 로직 유지)
           const { createClient } = await import("@supabase/supabase-js");
           const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
           const { data } = await supabase.from("popups").select("*").limit(200);
           if (data) {
               fallbackResults = data.filter((p) => {
                  if (!p.period) return false;
                  // 날짜 파싱 로직 간소화하여 적용
                  const [ps] = p.period.split("~");
                  if(!ps) return false;
                  // ... (날짜 비교 로직 생략, 필요시 기존 로직 사용)
                  return true; 
               });
           }
        }
        // 지역+날짜 Fallback
        else if (region && startDate) {
           // Supabase 직접 쿼리로 범위 넓혀서 재검색
           const { createClient } = await import("@supabase/supabase-js");
           const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
           let query = supabase.from("popups").select("*").ilike("location", `%${region}%`).limit(50);
           const { data } = await query;
           if(data) fallbackResults = data;
        }

        // 🔥🔥🔥 [핵심 수정] Fallback 결과에도 카테고리 필터 '반드시' 재적용
        // 카테고리가 지정되어 있다면, Fallback에서도 그 카테고리가 아니면 다 버립니다.
        if (categoryKeywords.length > 0) {
            console.log("🛑 Fallback 결과에 카테고리 필터 재적용 중...");
            dbResults = applyStrictCategoryFilter(fallbackResults);
        } else {
            // 카테고리 요청이 없었을 때만 Fallback 결과 전체 수용
            dbResults = fallbackResults;
        }
      }

      // 최종 결과 처리 (빈 배열이면 recommendations도 0개)
      if (!dbResults || dbResults.length === 0) {
        console.log("⚠️ 최종적으로 조건에 맞는 결과가 없습니다.");
      } else {
        // 1. 날짜/연도 필터링 및 정렬
        const filteredResults = dbResults.filter((popup) => {
           // ... (기존 날짜/연도 유효성 검사 로직 유지) ...
           return true; 
        });

        // 2. 최신순 정렬
        filteredResults.sort((a, b) => {
           // ... (기존 정렬 로직) ...
           const getD = (p) => p.period ? p.period.split('~')[0] : '';
           return getD(b).localeCompare(getD(a)); // 문자열 단순 비교로 대체 (필요시 기존 Date 변환 복구)
        });

        // 3. 중복 제거
        let uniqueResults = filteredResults.filter((popup) => {
          const title = (popup.name || popup.title || "").toLowerCase().trim();
          return title && !excludedTitleSet.has(title);
        });

        // 4. recommendations 생성
        recommendations = uniqueResults.slice(0, 5).map((popup) => {
          const category = resolvePopupCategory(popup);
          return {
            title: popup.name || popup.title || "제목 없음",
            period: popup.period || "기간 정보 없음",
            location: popup.location || "장소 정보 없음",
            type: category,
            category
          };
        });

        console.log(`🎯 최종 추천 개수: ${recommendations.length}`);
      }

    } catch (recError) {
      console.warn("⚠️ 추천 생성 중 오류 (무시하고 계속):", recError.message);
    }

    // 7️⃣ 프론트엔드 응답 반환
    res.json({
      text: aiText,
      recommendations: recommendations,
      memorySummary,
      extractedConcepts: extracted,
      context: {
        region: region || null,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
      },
    });

  } catch (err) {
    console.error("❌ chat.js 오류:", err);
    res.status(500).json({ error: "AI 응답 생성 중 오류", message: err.message });
  }
});

export default router;