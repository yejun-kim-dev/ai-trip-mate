"use client";
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SelectCountry from "../component/SelectCountry";
import SelectCity from "../component/SelectCity";
import SelectDate from "../component/SelectDate";
import TripCompanion from "../component/SelectCompanion";
import defaultTripImg from "../component/images/tripbasicimage.png";
import { USER_ID } from "../../data/user";

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
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState("");
  
  const country = location.state?.country;
  const city = location.state?.city;
  const startDate = location.state?.startDate;
  const endDate = location.state?.endDate;
const companions = location.state?.companions || {};
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
// ⚡ 여행 생성 버튼 클릭 핸들러 (수정됨)
  const handleCreateTrip = async () => {
    // 1. 유효성 검사
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
      // 날짜 포맷팅 (서버 전송용)
      const formattedStart = formatDate(tripData.dateRange.start);
      const formattedEnd = formatDate(tripData.dateRange.end);

      // 2. 서버로 데이터 전송
      const response = await fetch("http://localhost:8000/api/trip/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: USER_ID, 
          country: tripData.country,
          city: tripData.city,
          startDate: formattedStart,
          endDate: formattedEnd,
          companions: tripData.companions,
        }),
      });

      // 서버 응답 확인 (서버가 없거나 실패해도 로컬에는 저장되도록 try-catch 안에서 처리)
      const data = await response.json().catch(() => ({ trip: null }));
      
      // 🔥 [핵심 수정 1] ID 생성 (로컬 스토리지와 네비게이션에 동일한 ID 사용)
      const newTripId = Date.now();

      // 1) 기존 trips 불러오기
      const existingTrips = JSON.parse(localStorage.getItem("trips") || "[]");

      // 🔥 [핵심 수정 2] location.state 변수가 아니라, 현재 state(tripData) 값을 사용해야 함
      const newTrip = {
        id: newTripId, // 위에서 만든 ID 사용
        userId: USER_ID,
        country: tripData.country, // 변수명 country -> state인 tripData.country
        city: tripData.city,       // 변수명 city -> tripData.city
        dateRange: {
          start: tripData.dateRange.start,
          end: tripData.dateRange.end,
          text: `${formattedStart} ~ ${formattedEnd}`, // 포맷팅된 날짜 문자열 저장
        },
        companions: tripData.companions,
        imageUrl: defaultTripImg,
        schedule: {}
      };

      // 3) trips 배열에 추가해서 저장
      existingTrips.push(newTrip);
      localStorage.setItem("trips", JSON.stringify(existingTrips));

      // 4) MyTrip 페이지로 이동
      // 🔥 [핵심 수정 3] localStorage에 저장한 것과 똑같은 ID를 넘겨줘야 MyTrip이 데이터를 찾음
      navigate("/mytrip", {
        replace: false, // 뒤로가기 가능하게 하려면 false
        state: {
          id: newTripId, // Date.now()로 생성한 ID 전달
          tripData: newTrip // 바로 사용할 수 있도록 데이터도 전달
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
