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

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { userId, message, tripData, excludedTitles, conversationContext } = req.body;

    if (!message) return res.status(400).json({ error: "메시지가 없습니다." });
    if (!userId) return res.status(400).json({ error: "userId가 필요합니다." });
    
    // 이미 제시한 행사 제목 목록 (후속 질문에서 제외용)
    const excludedTitleSet = new Set((excludedTitles || []).map(t => t.toLowerCase().trim()));
    
    // 이전 대화 맥락 (지역, 날짜) - 카테고리만 바뀌어도 유지
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

    // 6️⃣ 추천 데이터 생성 (항상 검색 결과를 recommendations로 변환)
    let recommendations = [];
    
    // 지역/날짜 변수를 try 블록 밖에서 선언 (스코프 문제 해결)
    let region = null;
    let startDate = null;
    let endDate = null;
    let regionSource = null; // user | context | trip
    let dateSource = null;   // user | context | trip
    
    try {
      // 1️⃣ 사용자 메시지에서 우선 파싱
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

      // 2️⃣ 이전 대화 맥락 적용
      if (!region && contextRegion) {
        region = contextRegion;
        regionSource = "context";
      }
      if (!startDate && contextStartDate && contextEndDate) {
        startDate = contextStartDate;
        endDate = contextEndDate;
        dateSource = "context";
      }

      // 3️⃣ tripData는 최후 fallback
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

      // 4️⃣ 사용자 지역 + tripData 날짜 조합 방지 (부산 요청에 인천 일정 혼합 방지)
      if (regionSource === "user" && dateSource === "trip") {
        startDate = null;
        endDate = null;
        dateSource = null;
        console.log("ℹ️ 사용자 지역 요청과 tripData 날짜가 충돌하여 날짜 정보를 무시했습니다.");
      }
      
      // 🎯 메시지에서 '월 단위 요청' 감지 후 해당 월 전체로 start/end 확장
if (startDate && endDate) {
  const diffDays = (endDate - startDate) / (1000 * 60 * 60 * 24);

  // 메시지에서 "n월" 패턴 감지 (예: 1월, 12월, 7월 등)
  const monthMatch = message.match(/(\d{1,2})\s*월/);

  if (monthMatch) {
    const monthNumber = parseInt(monthMatch[1], 10);

    // 1~12월 범위 확인
    if (monthNumber >= 1 && monthNumber <= 12) {
      const year = startDate.getFullYear();

      // 사용자가 특정 '며칠' 범위를 지정한 게 아니라면 (예: 12/23~12/26 → 확장 X)
      if (diffDays <= 10) {
        // 해당 월 1일 00:00:00
        const newStart = new Date();
        newStart.setFullYear(year, monthNumber - 1, 1);
        newStart.setHours(0, 0, 0, 0);

        // 해당 월 마지막 날 23:59:59
        const lastDay = new Date(year, monthNumber, 0).getDate();
        const newEnd = new Date();
        newEnd.setFullYear(year, monthNumber - 1, lastDay);
        newEnd.setHours(23, 59, 59, 999);

        // startDate/endDate 갱신
        startDate = newStart;
        endDate = newEnd;

        console.log(`🔵 월 단위 요청 감지: ${monthNumber}월 전체로 확장됨`, startDate, endDate);
      }
    }
  }
}


      // 카테고리 키워드 추출 (축제, 전시, 팝업 등)
      const categoryKeywords = [];
      const messageLower = message.toLowerCase();
      if (messageLower.includes("축제")) categoryKeywords.push("축제");
      if (messageLower.includes("전시")) categoryKeywords.push("전시");
      if (messageLower.includes("팝업")) categoryKeywords.push("팝업");
      if (messageLower.includes("공연")) categoryKeywords.push("공연");
      if (messageLower.includes("이벤트")) categoryKeywords.push("이벤트");

      let dbResults = [];

      // 1️⃣ 지역과 날짜가 모두 있으면 정확한 기간으로 검색
      if (region && startDate && endDate) {
        const keyword = extractKeyword(message);
        dbResults = await fetchPopupsFromDB(region, startDate, endDate);
        
        // 카테고리 필터링 (카테고리 키워드가 있으면, 하지만 결과가 없으면 필터링 제거)
        if (categoryKeywords.length > 0 && dbResults.length > 0) {
          const filtered = dbResults.filter((popup) => {
            const category = (popup.category || "").toLowerCase();
            const name = (popup.name || popup.title || "").toLowerCase();
            return categoryKeywords.some(keyword => 
              category.includes(keyword) || name.includes(keyword)
            );
          });
          
          // 필터링 후에도 결과가 있으면 사용, 없으면 원본 사용
          if (filtered.length > 0) {
            dbResults = filtered;
            console.log(`✅ 카테고리 필터링: ${categoryKeywords.join(", ")} → ${dbResults.length}개`);
          } else {
            dbResults = [];
            console.log(`⚠️ 카테고리 필터링 후 결과 없음 → 요청 카테고리에 해당하는 데이터가 없습니다.`);
          }
        }
        
        // 사용자 요청 로그 저장
        await logUserRequest(userId, message, region);
        
        // 메모리 업데이트
        const category = categoryKeywords[0] || "팝업";
        await saveUserMemory(userId, region, category, keyword);
        
        console.log(`✅ 정확한 검색: ${region} 지역 ${startDate.toISOString()} ~ ${endDate.toISOString()} → ${dbResults.length}개`);
      } 
      // 2️⃣ 지역만 있으면 해당 지역의 최근/예정 이벤트 검색
      else if (region) {
        const now = new Date();
        const futureDate = new Date(now);
        futureDate.setMonth(futureDate.getMonth() + 6); // 6개월 후까지
        
        dbResults = await fetchPopupsFromDB(region, now, futureDate);
        
        // 카테고리 필터링 (카테고리 키워드가 있으면, 하지만 결과가 없으면 필터링 제거)
        if (categoryKeywords.length > 0 && dbResults.length > 0) {
          const filtered = dbResults.filter((popup) => {
            const category = (popup.category || "").toLowerCase();
            const name = (popup.name || popup.title || "").toLowerCase();
            return categoryKeywords.some(keyword => 
              category.includes(keyword) || name.includes(keyword)
            );
          });
          
          // 필터링 후에도 결과가 있으면 사용, 없으면 원본 사용
          if (filtered.length > 0) {
            dbResults = filtered;
            console.log(`✅ 카테고리 필터링: ${categoryKeywords.join(", ")} → ${dbResults.length}개`);
          } else {
            dbResults = [];
            console.log(`⚠️ 카테고리 필터링 후 결과 없음 → 요청 카테고리에 해당하는 데이터가 없습니다.`);
          }
        }
        
        console.log(`✅ 지역 검색: ${region} → ${dbResults.length}개`);
      }
      // 3️⃣ 날짜만 있으면 해당 기간의 전국 이벤트 검색 (지역 필터 없음)
      else if (startDate && endDate) {
        // 날짜만 있으면 전국 검색
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        // 기간 문자열로 변환
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        // 모든 팝업 가져와서 날짜 필터링
        const { data, error } = await supabase
          .from("popups")
          .select("*")
          .limit(200);
        
        if (!error && data) {
          // extractStartEnd 함수 로직 사용
          dbResults = data.filter((p) => {
            if (!p.period) return false;
            const [ps, pe] = p.period.split("~").map(s => s.trim());
            if (!ps) return false;
            
            // 날짜 정규화
            const normalizeDate = (str) => {
              if (!str) return null;
              str = str.trim();
              // 20240102 → 2024-01-02
              if (/^\d{8}$/.test(str)) {
                return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
              }
              if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
              return null;
            };
            
            const popupStart = normalizeDate(ps);
            const popupEnd = normalizeDate(pe || ps);
            
            if (!popupStart) return false;
            
            const popupStartDate = new Date(popupStart);
            const popupEndDate = new Date(popupEnd || popupStart);
            
            // 기간이 겹치는지 확인
            return popupEndDate >= startDate && popupStartDate <= endDate;
          });
        }
        
        console.log(`✅ 날짜 검색: ${startStr} ~ ${endStr} → ${dbResults.length}개`);
      }

      // 검색 결과가 없으면 기본 검색 수행 (지역/날짜 정보가 있을 때)
      if (dbResults.length === 0 && (region || startDate)) {
        console.log("⚠️ 검색 결과 없음, 기본 검색 수행");
        
        // 지역만 있으면 해당 지역 검색
        if (region && !startDate) {
          const now = new Date();
          const futureDate = new Date(now);
          futureDate.setMonth(futureDate.getMonth() + 6);
          dbResults = await fetchPopupsFromDB(region, now, futureDate);
        }
        // 날짜만 있으면 전국 검색
        else if (startDate && endDate && !region) {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          );
          
          const { data, error } = await supabase
            .from("popups")
            .select("*")
            .limit(200);
          
          if (!error && data) {
            dbResults = data.filter((p) => {
              if (!p.period) return false;
              const [ps, pe] = p.period.split("~").map(s => s.trim());
              if (!ps) return false;
              
              const normalizeDate = (str) => {
                if (!str) return null;
                str = str.trim();
                if (/^\d{8}$/.test(str)) {
                  return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
                }
                if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
                return null;
              };
              
              const popupStart = normalizeDate(ps);
              const popupEnd = normalizeDate(pe || ps);
              if (!popupStart) return false;
              
              const popupStartDate = new Date(popupStart);
              const popupEndDate = new Date(popupEnd || popupStart);
              return popupEndDate >= startDate && popupStartDate <= endDate;
            });
          }
        }
      }

      // 검색 결과 필터링 및 정렬
      if (dbResults.length > 0) {
        // 1️⃣ 해당 연도만 필터링 (시작일 기준)
        const targetYear = startDate ? startDate.getFullYear() : new Date().getFullYear();
        const currentYear = new Date().getFullYear();
        const filterYear = targetYear >= currentYear ? targetYear : currentYear;
        
        const filteredResults = dbResults.filter((popup) => {
          if (!popup.period) return false;
          
          // 기간 파싱
          const [ps, pe] = popup.period.split("~").map(s => s.trim());
          if (!ps) return false;
          
          // 날짜 정규화
          const normalizeDate = (str) => {
            if (!str) return null;
            str = str.trim();
            // 20240102 → 2024-01-02
            if (/^\d{8}$/.test(str)) {
              return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
            return null;
          };
          
          const popupStart = normalizeDate(ps);
          if (!popupStart) return false;
          
          const popupStartDate = new Date(popupStart);
          const popupStartYear = popupStartDate.getFullYear();
          
          // 해당 연도 또는 최근 1년 이내 시작한 행사만 포함
          // 오래된 행사 제외 (2년 이상 전에 시작한 행사 제외)
          const yearsAgo = currentYear - popupStartYear;
          if (yearsAgo > 2) return false;
          
          // 해당 연도에 진행 중인 행사만 포함
          if (startDate && endDate) {
            const popupEnd = normalizeDate(pe || ps);
            const popupEndDate = new Date(popupEnd || popupStart);
            // 요청한 기간과 겹치는지 확인
            return popupEndDate >= startDate && popupStartDate <= endDate;
          }
          
          // 연도만 확인
          return popupStartYear === filterYear || popupStartYear === currentYear;
        });
        
        // 2️⃣ 최신순 정렬 (시작일 기준 내림차순)
        filteredResults.sort((a, b) => {
          const getStartDate = (popup) => {
            if (!popup.period) return new Date(0);
            const [ps] = popup.period.split("~").map(s => s.trim());
            if (!ps) return new Date(0);
            
            const normalizeDate = (str) => {
              if (!str) return null;
              str = str.trim();
              if (/^\d{8}$/.test(str)) {
                return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
              }
              if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
              return null;
            };
            
            const normalized = normalizeDate(ps);
            return normalized ? new Date(normalized) : new Date(0);
          };
          
          const dateA = getStartDate(a);
          const dateB = getStartDate(b);
          return dateB - dateA; // 최신순 (내림차순)
        });
        
        // 3️⃣ 이미 제시한 행사 제외
        const uniqueResults = filteredResults.filter((popup) => {
          const title = (popup.name || popup.title || "").toLowerCase().trim();
          return !excludedTitleSet.has(title) && title !== "";
        });
        
        // 4️⃣ 프론트엔드 형식으로 변환 (최대 5개)
        recommendations = uniqueResults.slice(0, 5).map((popup) => ({
          title: popup.name || popup.title || "제목 없음",
          period: popup.period || "기간 정보 없음",
          location: popup.location || "장소 정보 없음",
          type: popup.category || "팝업",
        }));

        const excludedCount = filteredResults.length - uniqueResults.length;
        console.log(`✅ Recommendations 생성: ${recommendations.length}개 (필터링 전: ${dbResults.length}개, 제외된 항목: ${excludedCount}개)`);
      } else {
        console.log("⚠️ 검색 결과가 없어 recommendations가 비어있습니다.");
        
        // 검색 결과가 없어도 기본 검색 시도 (최후의 수단)
        if (region || startDate) {
          try {
            const { createClient } = await import("@supabase/supabase-js");
            const supabase = createClient(
              process.env.SUPABASE_URL,
              process.env.SUPABASE_SERVICE_ROLE_KEY
            );
            
            let query = supabase.from("popups").select("*");
            
            // 지역이 있으면 지역 필터 적용
            if (region) {
              query = query.ilike("location", `%${region}%`);
            }
            
            const { data, error } = await query.limit(50);
            
            if (!error && data && data.length > 0) {
              // 날짜 필터링
              let filtered = data;
              if (startDate && endDate) {
                filtered = data.filter((p) => {
                  if (!p.period) return false;
                  const [ps, pe] = p.period.split("~").map(s => s.trim());
                  if (!ps) return false;
                  
                  const normalizeDate = (str) => {
                    if (!str) return null;
                    str = str.trim();
                    if (/^\d{8}$/.test(str)) {
                      return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
                    }
                    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
                    return null;
                  };
                  
                  const popupStart = normalizeDate(ps);
                  const popupEnd = normalizeDate(pe || ps);
                  if (!popupStart) return false;
                  
                  const popupStartDate = new Date(popupStart);
                  const popupEndDate = new Date(popupEnd || popupStart);
                  return popupEndDate >= startDate && popupStartDate <= endDate;
                });
              }
              
              // 최신순 정렬 및 제외
              filtered.sort((a, b) => {
                const getDate = (p) => {
                  if (!p.period) return new Date(0);
                  const [ps] = p.period.split("~").map(s => s.trim());
                  if (!ps) return new Date(0);
                  const normalizeDate = (str) => {
                    if (!str) return null;
                    str = str.trim();
                    if (/^\d{8}$/.test(str)) {
                      return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
                    }
                    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
                    return null;
                  };
                  const normalized = normalizeDate(ps);
                  return normalized ? new Date(normalized) : new Date(0);
                };
                return getDate(b) - getDate(a);
              });
              
              const unique = filtered.filter((popup) => {
                const title = (popup.name || popup.title || "").toLowerCase().trim();
                return !excludedTitleSet.has(title) && title !== "";
              });
              
              recommendations = unique.slice(0, 5).map((popup) => ({
                title: popup.name || popup.title || "제목 없음",
                period: popup.period || "기간 정보 없음",
                location: popup.location || "장소 정보 없음",
                type: popup.category || "팝업",
              }));
              
              console.log(`✅ 기본 검색으로 Recommendations 생성: ${recommendations.length}개`);
            }
          } catch (fallbackError) {
            console.warn("⚠️ 기본 검색도 실패:", fallbackError.message);
          }
        }
      }
    } catch (recError) {
      console.warn("⚠️ 추천 생성 중 오류 (무시하고 계속):", recError.message);
      console.warn("⚠️ 오류 스택:", recError.stack);
      // 추천 실패해도 채팅은 계속 진행
    }

    // 7️⃣ 프론트엔드가 읽기 쉬운 JSON 포맷으로 반환
    res.json({
      text: aiText,            // ← 말풍선에 넣을 텍스트
      recommendations: recommendations,  // ← 추천 리스트
      memorySummary,
      extractedConcepts: extracted,
      // 다음 요청을 위한 맥락 정보 (지역, 날짜)
      context: {
        region: region || null,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
      },
    });

  } catch (err) {
    console.error("❌ chat.js 오류:", err);
    console.error("❌ 오류 스택:", err.stack);
    res.status(500).json({ 
      error: "AI 응답 생성 중 오류",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
});

export default router;
