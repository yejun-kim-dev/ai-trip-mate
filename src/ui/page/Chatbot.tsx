import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import sendIcon from "../component/images/send.png"; // 경로 확인 필요
import { useLocation, useNavigate } from "react-router-dom";

// ✅ 타입 정의
interface RecommendationItem {
  title: string;
  period: string;
  location: string;
  type: string; // 예: "전시 체험", "공연"
  category?: string; // 백엔드 원본 카테고리
}

interface Message {
  id: number;
  isUser: boolean;
  text?: string; // 일반 텍스트 메시지
  recommendations?: RecommendationItem[]; // 추천 리스트가 있을 경우
}

const sanitizeTripData = (data: any) => {
  if (!data) return null;

  const normalizeDate = (value: any) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  };

  return {
    id: data.id ?? data.tripNo ?? null,
    city: data.city ?? null,
    country: data.country ?? null,
    location: data.location ?? data.city ?? null,
    dateRange: data.dateRange
      ? {
          start: normalizeDate(data.dateRange.start),
          end: normalizeDate(data.dateRange.end),
        }
      : null,
  };
};

const ChatbotPage: React.FC = () => {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const tripData = location.state?.tripData;
  
  // 이전 대화 맥락 저장 (지역, 날짜) - 카테고리만 바뀌어도 유지
  const [lastContext, setLastContext] = useState<{
    region: string | null;
    startDate: string | null;
    endDate: string | null;
  } | null>(null);

  // ✅ 채팅 데이터 상태 관리 (초기값: 원본 디자인 예시 데이터)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      isUser: false,
      text: "안녕하세요! AI.Trip Mate입니다.✈️\n여행 계획을 도와드릴까요? 원하시는 지역이나 일정을 말씀해주세요.",
    },
  ]);

  // ✅ 로컬스토리지 초기화 (기존 로직 유지)
  useEffect(() => {
    const stored = localStorage.getItem("trips");
    if (!stored || stored === "[]") {
      try {
        // 경로가 맞는지 확인해주세요
        import("../component/data/dummyTrips").then(({ defaultTrips }) => {
          console.log("💾 기본 여행 데이터를 로컬스토리지에 등록합니다");
          localStorage.setItem("trips", JSON.stringify(defaultTrips));
        });
      } catch (e) {
        console.warn("dummyTrips 로드 실패");
      }
    }
  }, []);

  // ✅ 메시지 추가 시 스크롤 하단 이동
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ✅ 일정 추가 로직
  const handleAddRecommendation = (item: RecommendationItem) => {
    if (!tripData) {
      alert("여행 정보가 없습니다.");
      return;
    }

    let trips = JSON.parse(localStorage.getItem("trips") || "[]");
    let targetIndex = trips.findIndex(
      (t: any) =>
        Number(t.id) === Number(tripData.id) ||
        Number(t.tripNo) === Number(tripData.tripNo)
    );

    if (targetIndex === -1) {
      alert("오류: 여행 정보를 찾을 수 없습니다.");
      return;
    }

    const dayKey = "1";
    const updatedTrip = {
      ...trips[targetIndex],
      schedule: {
        ...trips[targetIndex].schedule,
        [dayKey]: [
          ...(trips[targetIndex].schedule?.[dayKey] || []),
          {
            id: Date.now(),
            name: item.title,
            period: item.period,
            location: item.location,
          },
        ],
      },
    };

    trips[targetIndex] = updatedTrip;
    localStorage.setItem("trips", JSON.stringify(trips));

    navigate("/mytrip", { state: { tripData: updatedTrip }, replace: true });
  };

  // ✅ 메시지 전송 핸들러
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
  e.preventDefault();

  const fd = new FormData(e.currentTarget);
  const msg = String(fd.get("msg") || "").trim();
  if (!msg) return;

  // 입력창 리셋
  (e.currentTarget.elements.namedItem("msg") as HTMLInputElement).value = "";

  // 1️⃣ 사용자 메시지 표시
  setMessages((prev) => [
    ...prev,
    { id: Date.now(), isUser: true, text: msg },
  ]);

  // 2️⃣ 이미 제시한 recommendations 추출 (후속 질문에서 제외용)
  const excludedTitles = messages
    .filter(msg => msg.recommendations && msg.recommendations.length > 0)
    .flatMap(msg => msg.recommendations!.map(rec => rec.title));

  // 3️⃣ 이전 대화 맥락 사용 (서버 응답의 context)
  const conversationContext = lastContext;

  const sanitizedTripData = sanitizeTripData(tripData);

  try {
    // 4️⃣ 서버 호출 (Vite 프록시 사용)
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "test-user",   // 실제 userId 넣거나 state에서 전달
        message: msg,
        tripData: sanitizedTripData,
        excludedTitles: excludedTitles, // 이미 제시한 행사 제목 목록
        conversationContext: conversationContext, // 이전 대화 맥락
      }),
    });

    // 3️⃣ HTTP 상태코드 에러 처리
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `서버 오류 (${res.status}): ${errorText || "응답 본문 없음"}`
      );
    }

    let data: any = null;

    // 4️⃣ JSON 파싱 오류 처리
    try {
      data = await res.json();
    } catch (err) {
      throw new Error("서버 응답을 JSON으로 파싱할 수 없습니다.");
    }

    // 5️⃣ 백엔드에서 전달한 error 필드 처리
    if (data.error) {
      throw new Error(`서버 오류: ${data.error}`);
    }

    // 6️⃣ AI 텍스트 출력
    if (data.text) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          isUser: false,
          text: data.text,
        },
      ]);
    }

    // 7️⃣ 추천 카드 출력
    if (data.recommendations?.length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          isUser: false,
          recommendations: data.recommendations,
        },
      ]);
    }
    
    // 8️⃣ 다음 요청을 위한 맥락 정보 저장
    if (data.context) {
      setLastContext(data.context);
    }
  } catch (error: any) {
    console.error("❌ 클라이언트 처리 오류:", error);
    console.error("❌ 오류 타입:", error?.name);
    console.error("❌ 오류 메시지:", error?.message);

    // 네트워크 오류인지 확인
    let errorMessage = "";
    if (error?.name === "TypeError" && error?.message?.includes("fetch")) {
      errorMessage = "서버에 연결할 수 없습니다.\n\n확인 사항:\n1. 서버가 실행 중인지 확인 (npm run server)\n2. 서버가 포트 8000에서 실행 중인지 확인\n3. 브라우저 콘솔에서 자세한 오류 확인";
    } else {
      errorMessage =
        error?.message ||
        "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    }

    // UI 출력
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 3,
        isUser: false,
        text: `⚠️ 오류 발생:\n${errorMessage}`,
      },
    ]);
  }
};


  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] relative">
      {/* 상단 헤더 */}
      <div className="flex items-end h-[124px] px-4 border-b border-gray-200 bg-white sticky top-0 z-20">
        <button
          onClick={() => navigate(-1)}
          className="absolute bottom-2 left-4 bg-transparent p-2 rounded-full 
                     hover:bg-black/0 transition outline-none border-none 
                     focus:outline-none focus:ring-0 active:outline-none active:border-none z-50"
          aria-label="뒤로 가기"
        >
          <ChevronLeft className="w-8 h-8 text-[#969696]" strokeWidth={2} />
        </button>
        <h1 className="flex-1 text-center font-semibold text-[20px] text-[#319CE5] mb-6">
          AI.Trip Mate
        </h1>
        <div className="w-4" />
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {messages.map((msg) => (
          // ✅ 1. [메시지 간 간격] 
          // space-y-3 같은 것을 지우고, 오직 mb-6만 남겨서 '다음 메시지와의 거리'만 담당하게 합니다.
          <div key={msg.id} className="flex flex-col w-full mb-2">
            
            {/* 텍스트 메시지 */}
            {msg.text && (
              <div className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`relative max-w-[85%] px-3.5 py-2 rounded-lg text-[14px] leading-snug shadow-md text-left whitespace-pre-wrap
                    ${msg.isUser ? "bg-[#2D9CDB] text-white" : "bg-[#D9D9D9] text-[#333] border"}`}
                  style={{
                    boxShadow: msg.isUser
                      ? "0 2px 6px rgba(0,0,0,0.15)"
                      : "0 2px 6px rgba(37,37,37,0.1)",
                  }}
                >
                  {msg.text}
                  {/* 말풍선 꼬리 (코드 생략 없이 유지) */}
                  <div
                    className={`absolute bottom-3 w-0 h-0 ${
                      msg.isUser ? "right-[-6px]" : "left-[-6px]"
                    }`}
                    style={
                      msg.isUser
                        ? { borderLeft: "8px solid #2D9CDB", borderTop: "6px solid transparent", borderBottom: "6px solid transparent" }
                        : { borderRight: "8px solid #D9D9D9", borderTop: "6px solid transparent", borderBottom: "6px solid transparent" }
                    }
                  />
                </div>
              </div>
            )}

            {/* 추천 카드 리스트 */}
            {msg.recommendations && (
              // ✅ 2. [텍스트와 박스 사이 간격]
              // 여기서 mt-[2px]를 주면 위 텍스트 말풍선과의 거리만 따로 조절됩니다.
              <div className="w-[90%] bg-[#F2F2F2] rounded-xl p-2 shadow-inner mt-[1px]">
                <div className="flex flex-col space-y-1">
                  {msg.recommendations.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-lg w-full h-[70px] shadow-sm p-2 flex items-stretch">
                      {/* ... 카드 내부 내용 생략 (기존과 동일) ... */}
                      {/* (카드 코드 전체는 위와 동일하게 유지하세요) */}
                      <div className="flex flex-col justify-center items-center pr-2 border-r border-gray-300 w-[50px] min-w-[50px]">
                          <p className="text-[11px] font-semibold text-gray-700 text-center leading-tight whitespace-pre-wrap">
                            {item.category || item.type || "기타"}
                          </p>
                      </div>
                      <div className="flex-1 flex justify-between pl-4 text-left items-center overflow-hidden mt-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-gray-900 truncate pr-1">{item.title}</p>
                            <p className="text-[11px] text-gray-500 truncate">기간: {item.period}</p>
                            <p className="text-[11px] text-gray-500 truncate">장소: {item.location}</p>
                          </div>
                          <button 
                            onClick={() => handleAddRecommendation(item)}
                            className="flex-shrink-0 text-[#706F6F] text-[23px] font-medium bg-transparent border-none mr-[8px] w-[20px] h-[20px] p-0 flex items-center justify-center leading-none -translate-y-[5px] hover:bg-black/0 transition outline-none border-none focus:outline-none focus:ring-0 active:outline-none active:border-none z-50"
                          >
                            +
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 입력창 (sticky 유지 + 키보드 대응) */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-8 left-0 w-full bg-transparent px-3 pt-3 z-30 "
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }} // 아이폰 하단 바 대응
      >
        <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-300 px-4 py-2.5">
          <input
            name="msg"
            type="text"
            placeholder="Write your message"
            className="flex-1 text-[15px] text-gray-700 placeholder-gray-400 bg-transparent focus:outline-none"
            autoComplete="off"
            inputMode="text"
            onFocus={scrollToBottom} // ✅ 포커스 시 스크롤을 아래로 밀어줌
          />

          <button type="submit" className="bg-transparent border-none p-0 ml-2">
            <img src={sendIcon} alt="send" className="w-5 h-5 object-contain" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatbotPage;