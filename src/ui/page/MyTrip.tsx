"use client";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import SelectCountry from "../component/SelectCountry";
import SelectCity from "../component/SelectCity";
import SelectDate from "../component/SelectDate";
import SelectCompanion from "../component/SelectCompanion";
import TripCompanionSelector from "../component/SelectCompanion";
import TripCompanion from "../component/SelectCompanion";

interface Companions {
  [key: string]: number;
}

interface TripState {
  country: string;
  flag?: string;
  city: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
    text?: string; // ✅ 문자열(날짜 범위 표시) 추가
  };
  companions: Companions;
}

export default function MyTrip() {
  const [step, setStep] = useState(1);
  const [tripData, setTripData] = useState<TripState>({
    country: "",
    city: "",
    dateRange: { start: null, end: null },
    companions: { friends: 0, family: 0, couple: 0, others: 0 },
  });

  const navigate = useNavigate();
  const goHome = () => navigate("/");

  const totalCompanions = Object.values(tripData.companions).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#FFFDFD] flex flex-col max-w-md mx-auto relative">
      {/* ✅ 헤더 (X 버튼 + 타이틀 중앙 고정) */}
      <div className="w-full flex items-center px-4 py-3 border-b border-gray-100 bg-white pt-[40px] relative z-50">
        <button
          onClick={goHome}
          className="text-[#757575] text-[30px] z-10 p-2 rounded-full bg-transparent hover: transition duration-300 focus:outline-none 
  hover:border-none active:outline-none active:shadow-lg"
          aria-label="여행 생성 닫기"
        >
          {/* ✕ 아이콘 */}
          ✕
        </button>

        {/* 중앙 제목 */}
        <div className="absolute inset-x-0 text-center pointer-events-none">
          <h1 className="font-bold text-[#319CE5] text-[20px]">새 여행 만들기</h1>
        </div>
      </div>

      {/* ✅ STEP 1: 여행 개요 화면 */}
      {step === 1 && (
        <div className="p-4 space-y-3 pt-10">
          {/* 여행 국가 */}
          <InputBox
            value={tripData.country || "여행 국가"}
            onClick={() => setStep(2)}
          />

          {/* 여행 지역 */}
          <InputBox
            value={tripData.city || "여행 지역"}
            onClick={() => setStep(3)}
          />

          {/* 여행 날짜 */}
          <InputBox
          value={
            tripData.dateRange.text
              ? tripData.dateRange.text
              : "여행 날짜"
          }
          onClick={() => setStep(4)}
/>

          {/* 여행 동반자 */}
          <InputBox
            value={totalCompanions > 0 ? "동반자 선택됨" : "여행 동반자"}
            onClick={() => setStep(5)}
          />

          {/* ✅ 하단 "여행 생성" 버튼 */}
          <div className="fixed bottom-0 left-0 right-0 flex justify-center p-4 bg-white shadow-top z-40">
            <button
              onClick={() => console.log("✅ 최종 여행 데이터:", tripData)}
              className="fixed bottom-12 bg-gradient-to-r from-[#319CE5] to-[#65E0FF] text-white font-semibold px-11 py-2.5 rounded-full shadow-lg text-[16px]
              hover:from-[#2474b0] hover:to-[#52c0d9] transition duration-300 focus:outline-none active:scale-95"
            >
              여행 생성
            </button>
          </div>
        </div>
      )}

      {/* ✅ STEP 2~5: 선택 페이지 (카드형 확장 디자인 적용된 컴포넌트) */}
      {step === 2 && (
        <SelectCountry
          setTripData={setTripData}
          onClose={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <SelectCity
          setTripData={setTripData}
          onClose={() => setStep(1)}
          selectedCountry={tripData.country} // ✅ 현재 선택된 나라 전달
        />
      )}
      {step === 4 && (
        <SelectDate
          setTripData={setTripData}
          onClose={() => setStep(1)}
        />
      )}

      {step === 5 && (
        <TripCompanion
          tripData={tripData} 
          setTripData={setTripData} 
        />
      )}

    </div>
  );
}

// ✅ 공용 입력 박스
const InputBox = ({ value, onClick }: any) => (
  <input
    readOnly
    value={value}
    onClick={onClick}
    className="w-[96%] py-[12px] px-[12px] border border-[#D4D4D4] rounded-[10px]
     text-[14px] text-[#4B4B4B] bg-[#F8F8F8] cursor-pointer shadow-sm
     placeholder:text-[#8C8C8C] focus:outline-none focus:ring-0 hover:bg-[#F0F0F0] transition"
  />
);
