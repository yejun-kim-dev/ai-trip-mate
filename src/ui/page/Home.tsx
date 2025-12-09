"use client";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// ✅ TripState 타입은 그대로 사용
import { TripState } from "../component/data/dummyTrips";
import chatbotIcon from "../component/images/chatbot_icon.png";
import defaultTripImg from "../component/images/tripbasicimage.png";
import { USER_ID } from "../../data/user"; 

// 헬퍼 함수들 (그대로 유지)
const getCompanionSummary = (companions: Record<string, number> = {}) => {
  const entries = Object.entries(companions).filter(([_, v]) => v > 0);
  if (entries.length === 0) return "혼자 여행";
  const labelMap: Record<string, string> = {
    friends: "친구", family: "가족", couple: "연인", youth: "청소년",
    children: "어린이", elderly: "노약자", others: "지인",
  };
  const [key, value] = entries[0];
  const firstText = `${labelMap[key] || key} ${value}명`;
  return entries.length > 1 ? `${firstText} 외 ...` : `${firstText}과 함께`;
};

const formatDateRange = (startStr: string | Date | null, endStr: string | Date | null) => {
  if (!startStr || !endStr) return "날짜 미정";
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "날짜 미정";
    const fmt = (d: Date) =>
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    return `${fmt(start)} - ${fmt(end)}`;
  } catch (error) {
    console.error("날짜 변환 오류:", error);
    return "날짜 오류";
  }
};

export default function Home() {
  // ✅ 4. State는 하나로 통일합니다. (UI 렌더링용)
  const [trips, setTrips] = useState<TripState[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
  async function fetchDBTrips() {
    try {
      console.log("🚀 DB 여행 목록 요청 중...");

      const res = await fetch("http://localhost:8000/api/get-my-trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: USER_ID || "user001" }),
      });
        
        const json = await res.json();
        console.log("📦 DB 응답:", json);

        if (json.ok && json.trips) {
          // 🔥 DB 데이터를 기존 UI(TripState) 포맷에 맞게 변환 (매핑)
          const dbTrips: TripState[] = json.trips.map((t: any) => ({
  id: t.id,
  tripNo: t.id,
  userId: t.user_id,
  country: t.country,
  city: t.city,

  // 🔥 MyTrip이 기대하는 dateRange 구조 그대로
  dateRange: {
    start: t.start_date ? new Date(t.start_date) : null,
    end: t.end_date ? new Date(t.end_date) : null,
    text: t.start_date && t.end_date
      ? formatDateRange(t.start_date, t.end_date)
      : "날짜 미정",
  },

  // 이미지
  imageUrl: t.imageUrl || t.image_url || defaultTripImg,

  // companions 저장 컬럼이 아직 없다면 임시로 빈 객체 유지
  companions: t.companions ? t.companions : {},
}));


          // 변환된 데이터를 상태에 저장 -> 화면 갱신
          setTrips(dbTrips);
        }
      } catch (err) {
        console.error("❌ 여행 목록 로드 실패:", err);
        // 에러 시 빈 배열 유지
        setTrips([]);
      }
    }

    fetchDBTrips();
  }, []); 

  // ✅ 6. 핸들러는 그대로 유지 (DB에서 받은 데이터를 그대로 넘김)
  const handleTripClick = (trip: TripState) => {
    console.log("🧭 선택된 여행:", trip);
    // MyTrip 페이지로 ID와 데이터 전달
    navigate("/mytrip", { state: { id: trip.id, tripData: trip } });
  };

  const handleCreateTrip = () => {
    console.log("새 여행 만들기 클릭");
    navigate("/maketrip");
  };

  // ✅ 7. UI 렌더링 (건드리지 않음)
  return (
    <div className="flex flex-col items-center min-h-screen bg-[#FFFDFD] p-4 pb-24">
      {/* 헤더 */}
      <div className="w-full flex justify-between items-center mb-6 mt-6 px-4 pl-2">
        <h1 className="font-bold text-[#319CE5] text-[24px]">내 여행</h1>
        <button className="text-[#4B4B4B] text-[30px] bg-transparent border-none p-0">
          ☰
        </button>
      </div>

      {/* 여행 목록 */}
      <div className="w-full flex flex-col items-center gap-3 mb-8">
        {trips.length > 0 ? (
          trips.map((trip: TripState) => (
            <div
              key={trip.id} 
              onClick={() => handleTripClick(trip)}
              className="relative w-[96%] max-w-[420px] h-[150px] rounded-xl shadow-xl overflow-hidden cursor-pointer transform transition duration-300 hover:scale-[1.02]"
            >
              {/* 배경 이미지 */}
              <img
                src={trip.imageUrl || defaultTripImg}
                alt={`${trip.city} 여행`}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* 어두운 오버레이 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10"></div>
              {/* 텍스트 영역 */}
                <div className="absolute bottom-0 left-0 right-0 pb-4 px-5 flex flex-col justify-end text-white">
                  <div className="flex justify-between items-end w-full">
                    {/* 왼쪽 텍스트 블록 */}
                    <div className="flex flex-col items-start text-left">
                      <h2
                        className="font-extrabold text-[20px] leading-tight mb-1 tracking-tight 
                                  whitespace-nowrap overflow-hidden text-ellipsis"
                      >
                        {trip.country} {trip.city} 여행
                      </h2>

                      <p className="text-[14px] font-medium opacity-90">
                        {trip.dateRange.text || formatDateRange(trip.dateRange.start, trip.dateRange.end)}
                      </p>
                    </div>
                    {/* 오른쪽 동반자 정보 */}
                    <p className="text-[14px] font-medium opacity-80 whitespace-nowrap text-right">
                      {getCompanionSummary(trip.companions)}
                    </p>
                  </div>
                </div>
            </div>
          ))
        ) : (
          <p className="text-[#B0B0B0] mt-20 text-[14px]">
            불러올 여행이 없습니다.
          </p>
        )}
      </div>

      {/* 하단 버튼 */}
      <button
        onClick={handleCreateTrip}
        className="fixed bottom-14 bg-gradient-to-r from-[#319CE5] to-[#65E0FF] text-white font-semibold px-7 py-2.5 rounded-full shadow-lg text-[16px] 
         hover:from-[#2474b0] hover:to-[#52c0d9] transition duration-300 focus:outline-none 
         hover:border-none active:outline-none active:shadow-lg"
      >
        새 여행 만들기
      </button>
      {/* 💬 챗봇 버튼 */}
      <button
        onClick={() => navigate("/chatbot")}
        className="fixed bottom-9 right-8 rounded-full w-[62px] h-[62px] 
                  border-2 border-dashed border-gray-300 bg-white shadow-xl 
                  transition-all duration-100 focus:outline-none focus:ring-0 
                  active:scale-100 hover:bg-gray-50 hover:border-blue-400
                  flex items-center justify-center"
      >
        <div className="pointer-events-auto">
          <img
            src={chatbotIcon}
            alt="AI 챗봇"
            className="w-[84%] h-[84%] object-contain object-center rounded-full block scale-[8] translate-y-[4%]"
          />
        </div>
      </button>
    </div>
  );
}