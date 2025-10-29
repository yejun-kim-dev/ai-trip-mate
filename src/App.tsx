import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Home from "./ui/Home";
import MyTrip from "./ui/MyTrip";
import Chatbot from "./ui/Chatbot";
import "./App.css";
import React, { useState, useEffect } from "react";

// ⭐️ SplashScreen 정의는 파일 최상단에 하나만 둡니다. ⭐️
const SplashScreen = () => (
  // w-full h-full 대신 absolute inset-0로 프레임 영역을 덮습니다.
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white z-50">
    <h1 className="text-3xl font-bold">AI Trip Mate</h1>
  </div>
);

export default function App() {

  const [isLoading, setIsLoading] = useState(true);

  // 타이머 설정 (2초)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false); 
    }, 1000); 

    return () => clearTimeout(timer); 
  }, []);

  // ----------------------------------------------------
  // ⭐️ 🚨 이 부분이 빠졌기 때문에 로딩 화면이 사라진 것입니다! 🚨 ⭐️
  if (isLoading) {
      return (
          // 로딩 화면도 모바일 프레임 안에 보이도록 구조를 복제합니다.
          <div className="fixed inset-0 flex justify-center items-center bg-[#1B1B1B] overflow-hidden">
              <div
                  className="w-[430px] h-[860px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
                  style={{ transform: "scale(0.7)", transformOrigin: "center" }}
              >
                  <SplashScreen />
              </div>
          </div>
      );
  }
  // ----------------------------------------------------

  // isLoading이 false일 때만 메인 앱을 렌더링합니다.

  console.log("✅ App.tsx Loaded!"); // ✅ 여기에 추가

  return (
    // 배경 (fixed inset-0...)
    <div className="fixed inset-0 flex justify-center items-center bg-[#1B1B1B] overflow-hidden">
      
      {/* 📱 모바일 프레임 (w-[430px] h-[860px]...) */}
      <div
        className="w-[430px] h-[860px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
        style={{ transform: "scale(0.7)", transformOrigin: "center" }}
      >
        
        {/* ---------------------------------------------------- */}
        {/* ⭐️ 1. 메인 콘텐츠 영역 (Routes 추가) ⭐️ */}
        {/* flex-grow: 남은 공간을 모두 차지하도록 하여 푸터를 아래로 밉니다. */}
        <main className="flex-grow overflow-y-auto">
          <Routes>
            {/* 기본 경로 설정 */}
            <Route path="/" element={<Home />} />
            <Route path="/mytrip" element={<MyTrip />} />
            <Route path="/chatbot" element={<Chatbot />} />
          </Routes>
        </main>
        {/* ---------------------------------------------------- */}
        
        {/* ⭐️ 2. 푸터 위치 수정 (absolute 제거) ⭐️ */}
        {/* flex-col 내부에 배치하여 자연스럽게 바닥에 위치하도록 합니다. */}
        {/* absolute와 bottom-3 등의 고정 위치 클래스를 제거합니다. */}
      </div>
    </div>
  );
}
