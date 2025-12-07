"use client";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// ✅ 1. 'TripState' 타입과 'defaultTrips'를 data 파일에서 가져옵니다.
import { defaultTrips, TripState } from "../component/data/dummyTrips";
import chatbotIcon from "../component/images/chatbot_icon.png";
import defaultTripImg from "../component/images/tripbasicimage.png";

// ❌ 2. 개별 이미지는 import할 필요 없습니다. (dummyTrips에 URL이 포함되어 있음)
// import tripimage_sampleImg from "../component/images/tripimage_sample.jpg";
// import tripbox_sampleImg from "../component/images/tripbox_sample.jpg";

// ✅ 3. 헬퍼 함수들은 그대로 사용합니다. (MyTrip에서도 동일하게 사용)
const getCompanionSummary = (companions: Record<string, number> = {}) => {
  const entries = Object.entries(companions).filter(([_, v]) => v > 0);

  if (entries.length === 0) return "혼자 여행";

  const labelMap: Record<string, string> = {
    friends: "친구",
    family: "가족",
    couple: "연인",
    youth: "청소년",
    children: "어린이",
    elderly: "노약자",
    others: "지인",
  };

  // 첫 번째 관계만 표시
  const [key, value] = entries[0];
  const firstText = `${labelMap[key] || key} ${value}명`;

  // 여러 개면 "외 ..."로 축약
  return entries.length > 1 ? `${firstText} 외 ...` : `${firstText}과 함께`;
};


const formatDateRange = (startStr: string | Date | null, endStr: string | Date | null) => {
  if (!startStr || !endStr) return "날짜 미정";
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "날짜 미정";
    
    const fmt = (d: Date) =>
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
        d.getDate()
      ).padStart(2, "0")}`;
    
    return `${fmt(start)} - ${fmt(end)}`;
  } catch (error) {
    console.error("날짜 변환 오류:", error);
    return "날짜 오류";
  }
};

export default function Home() {
  // ✅ 4. state의 타입을 TripState 배열로 명시합니다.
  const [trips, setTrips] = useState<TripState[]>([]);
  const navigate = useNavigate();

  // ✅ 5. [핵심 수정] localStorage 로딩 및 데이터 포맷팅 로직 수정
  useEffect(() => {
    let storedTrips: TripState[] = [];
    
    // 🐞 [버그 수정] JSON.parse는 에러를 유발할 수 있으므로 try...catch로 감쌉니다.
    // 이것이 "페이지가 보이지 않던" 주된 원인일 가능성이 높습니다.
    try {
      const storedData = localStorage.getItem("trips") || "[]";
      storedTrips = JSON.parse(storedData);
      
      // 🚨 localStorage 데이터가 TripState[] 형식이 아닐 경우를 대비
      if (!Array.isArray(storedTrips)) {
        storedTrips = [];
      }

    } catch (error) {
      console.error("localStorage 파싱 에러:", error);
      storedTrips = []; // 👈 오류 발생 시 빈 배열로 초기화
      localStorage.removeItem("trips"); // 👈 손상된 데이터 제거
    }

    // ✅ 6. [로직 수정] 데이터를 변환하지 않고 '원본(raw)' 상태로 합칩니다.
    // MyTrip 페이지는 원본 TripState 객체를 필요로 합니다.
    setTrips(storedTrips);

    
  }, []); // 👈 의존성 배열은 비어있는 것이 맞습니다 (마운트 시 1회 실행)

  // ✅ 7. [로직 수정] 클릭 핸들러가 원본 'trip' 객체를 전달합니다.
  const handleTripClick = (trip: TripState) => {
    console.log("🧭 선택된 여행 (원본 데이터):", trip);
    // 👈 'trip.raw' 같은 복잡한 로직 없이, 원본 객체(TripState)를 그대로 전달
    navigate("/mytrip", { state: { tripData: trip } });
  };

  const handleCreateTrip = () => {
    console.log("새 여행 만들기 클릭");
    navigate("/maketrip");
  };

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
          // ✅ 8. [로직 수정] map 안에서 데이터를 화면에 맞게 '표시용'으로 변환합니다.
          trips.map((trip: TripState) => (
            <div
              key={trip.id} // 👈 key는 index보다 고유 ID(trip.id)를 사용
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
            아직 등록된 여행이 없습니다.
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