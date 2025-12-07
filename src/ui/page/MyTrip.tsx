"use client";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapPinOff, Plus } from "lucide-react";
import { TripState } from "../component/data/dummyTrips";
import chatbotIcon from "../component/images/chatbot_icon.png";
import defaultTripImg from "../component/images/tripbasicimage.png";
import { Camera } from "lucide-react";


export default function MyTrip() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawTripData: TripState | undefined = location.state?.tripData;

  // ✅ 뒤로가기(Back) 눌렀을 때 바로 홈으로 이동
  useEffect(() => {
    const handlePopState = () => {
      navigate("/", { replace: true });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]);

  // ✅ Chatbot → MyTrip 이동 시 히스토리 중복 제거
  useEffect(() => {
    if (location.state?.tripData) {
      window.history.replaceState({}, "", "/mytrip");
    }
  }, [location.state]);

  // ✅ 최신 tripData 동기화
  useEffect(() => {
    if (!rawTripData) return;

    const trips = JSON.parse(localStorage.getItem("trips") || "[]");
    const latestTrip = trips.find(
      (t: any) =>
        String(t.id) === String(rawTripData.id) ||
        String(t.tripNo) === String(rawTripData.tripNo)
    );

    if (latestTrip) {
      latestTrip.dateRange = {
        ...latestTrip.dateRange,
        start: new Date(latestTrip.dateRange.start),
        end: new Date(latestTrip.dateRange.end),
      };

      // ✅ location.state 갱신
      location.state = { tripData: latestTrip };
    }
  }, [location.key]);

  // ✅ 이미지 업로드 핸들러
const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result as string;
    setTripImage(base64);

    // ✅ localStorage 내 trips 업데이트
    const trips = JSON.parse(localStorage.getItem("trips") || "[]");
    const idx = trips.findIndex(
      (t: any) =>
        String(t.id) === String(tripData?.id) ||
        String(t.tripNo) === String(tripData?.tripNo)
    );
    if (idx !== -1) {
      trips[idx].imageUrl = base64;
      localStorage.setItem("trips", JSON.stringify(trips));
    }
  };
  reader.readAsDataURL(file);
};

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
    const DEFAULT_TRIP_IMAGE = 
    typeof defaultTripImg === 'string' 
      ? defaultTripImg 
      : (defaultTripImg as any).src || ""; // 객체라면 .src를 추출

  const [tripImage, setTripImage] = useState<string | null>(null);

  // 🔍 [진단 2] 초기화 로직 (콘솔 로그 추가)
  useEffect(() => {
    // 현재 tripData에 저장된 이미지 주소가 무엇인지 확인
    console.log("① 저장된 tripData 이미지:", tripData?.imageUrl);
    console.log("② 사용할 기본 이미지:", DEFAULT_TRIP_IMAGE);

    if (tripImage === null) {
      if (tripData?.imageUrl && tripData.imageUrl !== "") {
        console.log("👉 결정: 저장된 이미지 사용");
        setTripImage(tripData.imageUrl);
      } else {
        console.log("👉 결정: 기본 이미지 사용");
        setTripImage(DEFAULT_TRIP_IMAGE);
      }
    }
  }, [tripData]);


  if (!tripData) {
    return (
      <div className="min-h-[120vh] bg-white flex flex-col items-center justify-center max-w-md mx-auto p-4 text-center">
        <MapPinOff className="w-8 h-8 text-gray-300 mb-6" />
        <h1 className="text-[18px] font-bold text-gray-800 mb-2">
          여행 정보가 없습니다.
        </h1>
        <p className="text-gray-600 text-[15px] mb-10">
          홈 화면에서 여행을 선택해주세요.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 py-2.5 rounded-full bg-[#007AFF] text-[16px] text-white font-semibold shadow-md hover:bg-[#0056b3] transition"
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
        src={tripImage || DEFAULT_TRIP_IMAGE}
        alt={`${tripData.city} 여행`}
        className="absolute top-0 inset-0 w-full h-full object-cover transition-all duration-300"
        // ✨ [해결책] 이미지가 깨지면(엑스박스) 즉시 기본 이미지로 갈아끼우는 코드
        onError={(e) => {
          console.error("❌ 이미지 로드 실패! 기본 이미지로 대체합니다.");
          console.error("실패한 주소:", e.currentTarget.src);
          e.currentTarget.src = DEFAULT_TRIP_IMAGE;
          
          // 만약 기본 이미지조차 실패하면 아예 빈칸 방지용 색상으로 변경
          e.currentTarget.onerror = null; 
        }}
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
        {/* 📷 수정 아이콘 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute top-5 right-5 bg-black/40 hover:bg-black/60 transition p-1.5 rounded-full backdrop-blur-sm"
          aria-label="이미지 변경"
        >
          <Camera className="w-5 h-5 text-white" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* 🔙 뒤로가기 버튼 */}
        <button
          onClick={() => navigate("/", { replace: true })}
          className="absolute bottom-12 left-4 bg-transparent text-white p-2 rounded-full 
                     hover:bg-black/0 transition outline-none border-none 
                     focus:outline-none focus:ring-0 active:outline-none active:border-none"
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
          days.map((d, index) => {
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
                  {index === 0 && (
              <button
                onClick={() => alert(`AI가 ${d.day}일차 코스를 추천해드립니다!`)}
                className="ml-auto px-3 py-1 rounded-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white text-[11px] font-bold shadow-sm hover:opacity-90 transition-opacity"
              >
                AI 일정 생성
              </button>
            )}
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
                      <div className="flex flex-col items-start bg-[#F8FAFC] border border-gray-200 rounded-lg px-3 py-2 text-left">
                        <p className="text-[13px] font-semibold text-[#706F6F] leading-snug">
                          {place.name}
                        </p>
                        {(place as any).period || place.time ? (
                          <p className="text-[12px] font-medium text-[#706F6F]">
                            📅{" "}
                            {place.period && place.time
                              ? `${place.period} / ${place.time}`
                              : place.period || place.time}
                          </p>
                        ) : null}
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

      {/* 🎨 챗봇 버튼 */}
      <button
        onClick={() => {
          const trips = JSON.parse(localStorage.getItem("trips") || "[]");
          const foundTrip = trips.find(
            (t: any) =>
              Number(t.id) === Number(tripData.id) ||
              Number(t.tripNo) === Number(tripData.tripNo)
          );
          navigate("/chatbot", {
            state: { tripData: foundTrip || tripData },
            replace: true,
          });
        }}
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
