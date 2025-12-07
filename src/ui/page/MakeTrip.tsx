"use client";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import SelectCountry from "../component/SelectCountry";
import SelectCity from "../component/SelectCity";
import SelectDate from "../component/SelectDate";
import TripCompanion from "../component/SelectCompanion";
import defaultTripImg from "../component/images/tripbasicimage.png";

interface Companions {
  [key: string]: number;
}

interface TripState {
  country: string;
  flag?: string;
  city: string;
  dateRange: {
    start: Date | string | null;
    end: Date | string | null;
    text?: string;
  };
  companions: Companions;
}

export default function MakeTrip() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [tripData, setTripData] = useState<TripState>({
    country: "",
    city: "",
    dateRange: { start: null, end: null, text: "" },
    companions: { friends: 0, family: 0, couple: 0, others: 0 },
  });

  const navigate = useNavigate();
  const goHome = () => navigate("/");

  // ✅ 동반자 요약 함수
  const getCompanionSummary = (companions: any) => {
    const entries = Object.entries(companions) as [string, number][];
    const first = entries.find(([_, value]) => value > 0);
    if (!first) return "혼자 여행";
    const [key, value] = first;
    const labelMap: Record<string, string> = {
      friends: "친구",
      family: "가족",
      couple: "연인",
      youth: "청소년",
      children: "어린이",
      elderly: "노약자",
      others: "지인",
    };
    return `${labelMap[key] || key} ${value}명과 함께`;
  };

  // ✅ 날짜 포맷 함수 추가
  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  const totalCompanions = Object.values(tripData.companions).reduce(
    (a, b) => a + b,
    0
  );

  const handleStepClick = (clickedStep: number) => {
    setStep((prevStep) => (prevStep === clickedStep ? 1 : clickedStep));
  };

  // ⚡ 여행 생성 버튼 클릭 핸들러
// ⚡ 여행 생성 버튼 클릭 핸들러
const handleCreateTrip = async () => {
  if (
    !tripData.country ||
    !tripData.city ||
    !tripData.dateRange.start ||
    !tripData.dateRange.end ||
    totalCompanions === 0
  ) {
    setErrorMessage("모든 항목을 입력해주세요.");
    setTimeout(() => setErrorMessage(""), 2500);
    return;
  }

  setIsLoading(true);
  setErrorMessage("");

  try {
    const formattedStart = formatDate(tripData.dateRange.start);
    const formattedEnd = formatDate(tripData.dateRange.end);

    const response = await fetch("http://localhost:8000/api/trip/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: "user001", // 로그인 생기면 바꾸면 됨
        country: tripData.country,
        city: tripData.city,
        startDate: formattedStart,
        endDate: formattedEnd,
        companions: tripData.companions,
      }),
    });

    const data = await response.json();

    if (!data.trip) {
      throw new Error("여행 생성 실패");
    }
    // 1) 기존 trips 불러오기
const existingTrips = JSON.parse(localStorage.getItem("trips") || "[]");

// 2) 새 여행에 기본 이미지 붙여주기
const newTrip = {
  ...data.trip,
  imageUrl: defaultTripImg,  // 없으면 기본 이미지
};

// 3) trips 배열에 추가해서 저장
existingTrips.push(newTrip);
localStorage.setItem("trips", JSON.stringify(existingTrips));

// 4) MyTrip 페이지로 이동
navigate("/mytrip", { state: { tripData: newTrip } });


    navigate("/mytrip", { 
  state: { 
    tripData: {
      ...data.trip,
      imageUrl: defaultTripImg
    }
  } 
});

  } catch (err) {
    console.error(err);
    setErrorMessage("여행 생성 중 오류 발생");
  } finally {
    setIsLoading(false);
  }
};
  return (
    <div className="min-h-screen bg-[#FFFDFD] flex flex-col max-w-md mx-auto relative pb-[100px]">
      {/* ✅ 헤더 */}
      <div className="w-full flex items-center px-4 py-1 border-b border-gray-100 bg-white pt-[55px] sticky top-0 z-50">
        <button
          onClick={goHome}
          className="text-[#757575] text-[30px] z-10 p-2 rounded-full bg-transparent hover: transition duration-300 focus:outline-none 
          hover:border-none active:outline-none active:shadow-lg"
          aria-label="여행 생성 닫기"
        >
          ✕
        </button>
        <div className="absolute inset-x-0 text-center pointer-events-none">
          <h1 className="font-bold text-[#319CE5] text-[20px]">새 여행 만들기</h1>
        </div>
      </div>

      {/* ✅ 본문 영역 */}
      <div className="p-4 space-y-3 pt-6 pb-24">
        {/* --- 여행 국가 --- */}
        {step !== 2 ? (
          <InputBox
            value={tripData.country || "여행 국가"}
            onClick={() => handleStepClick(2)}
          />
        ) : (
          <SelectCountry setTripData={setTripData} onClose={() => setStep(1)} />
        )}

        {/* --- 여행 지역 --- */}
        {step !== 3 ? (
          <InputBox
            value={tripData.city || "여행 지역"}
            onClick={() => handleStepClick(3)}
          />
        ) : (
          <SelectCity
            setTripData={setTripData}
            onClose={() => setStep(1)}
            selectedCountry={tripData.country}
          />
        )}

        {/* --- 여행 날짜 --- */}
        {step !== 4 ? (
          <InputBox
            value={
              tripData.dateRange.text
                ? tripData.dateRange.text
                : "여행 날짜"
            }
            onClick={() => handleStepClick(4)}
          />
        ) : (
          <SelectDate setTripData={setTripData} onClose={() => setStep(1)} />
        )}

        {/* --- 여행 동반자 --- */}
        {step !== 5 ? (
          <InputBox
            value={totalCompanions > 0 ? "동반자 선택됨" : "여행 동반자"}
            onClick={() => handleStepClick(5)}
          />
        ) : (
          <div className="overflow-y-auto max-h-[calc(100vh-150px)]">
            <TripCompanion
              tripData={tripData}
              setTripData={setTripData}
              onClose={() => setStep(1)}
            />
          </div>
        )}
      </div>

      {/* ⚡ 에러 메시지 표시 */}
      {errorMessage && (
        <div className="fixed bottom-[90px] left-0 right-0 flex justify-center z-50">
          <div className="bg-[#FEE2E2] text-[#B91C1C] text-sm font-medium px-4 py-2 rounded-lg shadow-md">
            {errorMessage}
          </div>
        </div>
      )}

      {/* ✅ 하단 "여행 생성" 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center p-4 bg-white shadow-top z-40">
        <button
          onClick={handleCreateTrip}
          disabled={isLoading}
          className={`fixed bottom-12 bg-gradient-to-r from-[#319CE5] to-[#65E0FF] text-white font-semibold px-11 py-2.5 rounded-full shadow-lg text-[16px]
            hover:from-[#2474b0] hover:to-[#52c0d9] transition duration-300 focus:outline-none active:scale-95
            ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isLoading ? "여행 생성 중..." : "여행 생성"}
        </button>
      </div>

      {isLoading && <LoadingModal />}
    </div>
  );
}

const InputBox = ({ value, onClick }: any) => (
  <input
    readOnly
    value={value}
    onClick={onClick}
    className="w-full py-[12px] px-[12px] border border-[#D4D4D4] rounded-[10px]
     text-[14px] text-[#4B4B4B] bg-[#F8F8F8] cursor-pointer shadow-sm
     placeholder:text-[#8C8C8C] focus:outline-none focus:ring-0 hover:bg-[#F0F0F0] transition"
  />
);

const LoadingModal = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl shadow-2xl text-center w-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#319CE5] mx-auto mb-4"></div>
      <h4 className="text-lg font-bold text-[#4B4B4B]">여행 생성 중</h4>
      <p className="text-sm text-gray-500 mt-2">
        여행 정보를 분석하고 있어요. 잠시만 기다려 주세요.
      </p>
    </div>
  </div>
);
