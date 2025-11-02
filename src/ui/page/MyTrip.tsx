"use client";
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapPinOff, Plus } from "lucide-react";
import { TripState } from "../component/data/dummyTrips";
import chatbotIcon from "../component/images/chatbot_icon.png";

export default function MyTrip() {
  const navigate = useNavigate();
  const location = useLocation();

  const rawTripData: TripState | undefined = location.state?.tripData;

  const tripData = rawTripData
    ? {
        ...rawTripData,
        dateRange: {
          ...rawTripData.dateRange,
          start: rawTripData.dateRange.start
            ? new Date(rawTripData.dateRange.start)
            : null,
          end: rawTripData.dateRange.end
            ? new Date(rawTripData.dateRange.end)
            : null,
        },
      }
    : undefined;

  if (!tripData) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center max-w-md mx-auto p-4 text-center">
        <MapPinOff className="w-16 h-16 text-gray-300 mb-6" />
        <h1 className="text-xl font-bold text-gray-800 mb-4">
          여행 정보가 없습니다.
        </h1>
        <p className="text-gray-600 mb-8">
          홈 화면에서 여행을 선택해주세요.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 bg-[#007AFF] text-white rounded-lg shadow-md hover:bg-[#0056b3] transition"
        >
          홈으로 가기
        </button>
      </div>
    );
  }

  // ✅ 동반자 요약
  const getCompanionSummary = () => {
    if (!tripData.companions) return "혼자 여행";
    const entries = Object.entries(tripData.companions).filter(
      ([_, value]) => value > 0
    );
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

    const parts = entries.map(
      ([key, value]) => `${labelMap[key] || key} ${value}명`
    );
    return `${parts.join(", ")}과 함께`;
  };

  // ✅ 날짜 계산
  const startDate = tripData.dateRange.start;
  const endDate = tripData.dateRange.end;
  const isValidDate = startDate && endDate;
  const dayCount = isValidDate
    ? (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1
    : 0;

  const days =
    isValidDate && dayCount > 0
      ? Array.from({ length: dayCount }, (_, i) => {
          const date = new Date(startDate!);
          date.setDate(startDate!.getDate() + i);
          return {
            day: i + 1,
            date: `${String(date.getMonth() + 1).padStart(2, "0")}.${String(
              date.getDate()
            ).padStart(2, "0")}`,
          };
        })
      : [];

  return (
    <div className="min-h-screen bg-[#F2F4F5] flex flex-col max-w-md mx-auto relative pb-60">
      {/* 🎨 상단 이미지 섹션 */}
      <div className="fixed top-0 left-0 w-full max-w-md h-[190px] z-50">
        <img
          src={
            tripData.imageUrl ||
            "https://placehold.co/600x400/007AFF/FFFFFF?text=My+Trip"
          }
          alt={`${tripData.city} 여행`}
          className="absolute top-0 inset-0 w-full h-full object-cover"
        />
        <div className="absolute top-0 inset-0 bg-gradient-to-t from-black/60 via-black/50 to-transparent" />
        <div className="absolute bottom-5 left-0 right-0 text-center text-white px-6">
          <h2 className="font-bold text-[20px] drop-shadow-md">
            {tripData.country} {tripData.city} 여행
          </h2>
          <p className="text-[14px] mt-1 opacity-90">
            {tripData.dateRange.text ||
              `${startDate?.toLocaleDateString()} ~ ${endDate?.toLocaleDateString()}`}
          </p>
          <p className="text-[14px] opacity-80">{getCompanionSummary()}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="absolute bottom-12 left-4 bg-transparent text-white p-2 rounded-full hover:bg-black/0 transition outline-none border-none focus:outline-none focus:ring-0 active:outline-none active:border-none"
          aria-label="뒤로 가기"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
        </button>
      </div>

      {/* 🎨 일차별 일정 */}
      <div className="flex flex-col gap-2 px-5 mt-[210px]">
        {days.length > 0 ? (
          days.map((d) => {
            const placesForDay = tripData.schedule?.[d.day] || [];

            return (
              <div
                key={d.day}
                className="bg-white rounded-xl shadow-sm p-3 border border-gray-100"
              >
                <div className="flex items-baseline gap-1 mb-3">
                  <p className="font-bold text-[#706F6F] text-[16px]">
                    {d.day}일차
                  </p>
                  <span className="text-[#706F6F] font-medium text-[14px]">
                    {d.date}
                  </span>
                </div>

                <div className="relative flex flex-col gap-2">
                  {placesForDay.length > 0 && (
                    <div className="absolute left-2.5 top-5 bottom-2 w-0.5 bg-[#D9D9D9] z-0" />
                  )}

                  {placesForDay.map((place, index) => (
                    <div key={place.id} className="relative pl-10">
                      {/* 🔵 번호 동그라미 */}
                      <div
                        className="absolute -left-0 top-1/4 w-5 h-5 bg-[#007AFF] rounded-full flex 
                        items-center justify-center text-[#FFFDFD] font-bold text-[14px] ring-4 ring-white"
                      >
                        {index + 1}
                      </div>

                      {/* ✅ 장소 카드 */}
                      <div className="flex flex-col items-start bg-[#F8FAFC] border border-gray-200 rounded-lg px-4 py-1">
                        {/* 장소 이름 */}
                        <p className="text-[13px] font-semibold text-[#706F6F]">
                          {place.name}
                        </p>

                        {/* 운영기간 + 시간 */}
                        {(place as any).period || place.time ? (
                          <p className="text-[12px] font-medium text-[#706F6F]">
                            📅{" "}
                            {place.period && place.time
                              ? `${place.period} / ${place.time}`
                              : place.period || place.time}
                          </p>
                        ) : null}

                        {/* 위치 */}
                        {place.location && (
                          <p className="text-[12px] font-medium text-[#706F6F]">
                            📍 {place.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* 💡 장소 추가 */}
                  <div className="relative pl-10 z-0">
                    <div
                      className="absolute -left-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 
                      border-dashed border-gray-300 rounded-full flex 
                      items-center justify-center ring-4 ring-white"
                    >
                      <Plus className="w-3 h-3 text-gray-400" />
                    </div>
                    <button
                      onClick={() => alert(`${d.day}일차 장소 추가`)}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg py-1 px-4 text-[#706F6F] text-[14px] bg-white 
                      hover:bg-gray-50 hover:border-blue-400 
                      hover:text-blue-500 transition-all duration-200 flex items-center justify-center gap-2
                      focus:outline-none focus:ring-0"
                    >
                      장소 추가
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-400 text-center mt-8">
            여행 날짜 정보가 없습니다.
          </p>
        )}
      </div>

      {/* 🎨 챗봇 버튼 (이미지로 교체됨) */}
      <button
  onClick={() => navigate("/chatbot")}
  className="fixed bottom-10 right-8 
             rounded-full w-12 h-12 items-center
             border-2 border-dashed border-gray-300 
             bg-white shadow-xl transition-all duration-100 
             focus:outline-none focus:ring-0 
             active:scale-100
             hover:bg-gray-50 hover:border-blue-400" 
>
 <img
  src={chatbotIcon}
  alt="AI 챗봇"
  className="w-full h-full object-contain object-center rounded-full block scale-[8] translate-y-[4%]"
/>
</button>
    </div>
  );
}
