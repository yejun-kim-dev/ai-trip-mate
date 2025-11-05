import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./ui/page/Home";
import MakeTrip from "./ui/page/MakeTrip";
import Chatbot from "./ui/page/Chatbot";
import MyTrip from "./ui/page/MyTrip";
import "./App.css";
import React, { useState, useEffect } from "react";
import { defaultTrips } from "./ui/component/data/dummyTrips";

// ✅ 로딩 화면
const SplashScreen = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white z-50">
    <h1 className="text-3xl font-bold">AI Trip Mate</h1>
  </div>
);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  // ✅ 스플래시 화면 1초 노출
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // ✅ 앱 최초 실행 시, localStorage에 더미 여행 데이터 동기화
  useEffect(() => {
    try {
      const storedTrips = JSON.parse(localStorage.getItem("trips") || "[]");
      const storedTripIds = new Set(
        storedTrips.map((t: any) => String(t.id || t.tripNo))
      );

      const tripsToAdd = defaultTrips.filter(
        (dummyTrip) => !storedTripIds.has(String(dummyTrip.id || dummyTrip.tripNo))
      );

      if (tripsToAdd.length > 0) {
        console.log("💾 [App.tsx] 누락된 더미 데이터 추가");
        localStorage.setItem(
          "trips",
          JSON.stringify([...storedTrips, ...tripsToAdd])
        );
      } else {
        console.log("💾 [App.tsx] 더미 데이터가 이미 존재");
      }
    } catch (error) {
      console.error("localStorage 처리 중 오류:", error);
      localStorage.setItem("trips", JSON.stringify(defaultTrips));
    }
  }, []);

  // ✅ 로딩 중일 때 스플래시 표시
  if (isLoading) {
    return (
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

  console.log("✅ App.tsx Loaded!");

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-[#1B1B1B] overflow-hidden">
      {/* 📱 모바일 프레임 */}
      <div
        className="w-[430px] h-[860px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
        style={{ transform: "scale(0.7)", transformOrigin: "center" }}
      >
        {/* 메인 콘텐츠 */}
        <main className="flex-grow overflow-y-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/maketrip" element={<MakeTrip />} />
            <Route path="/mytrip" element={<MyTrip />} />
            <Route path="/chatbot" element={<Chatbot />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
