import React from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  const goToMyTrip = () => {
    navigate("/mytrip");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-4">🌏 AI Trip Mate</h1>
      <p className="mb-6 text-lg">
        여행지를 입력하고 AI가 일정을 만들어드릴게요!
      </p>

      <input
        type="text"
        placeholder="예: 서울, 제주, 도쿄"
        className="p-2 rounded text-black mb-3 w-80"
      />
      <button className="bg-blue-500 px-4 py-2 rounded mb-4">
        AI 여행 일정 생성
      </button>

      <button
        onClick={goToMyTrip}
        className="bg-green-500 px-4 py-2 rounded-lg"
      >
        🧳 내 여행 만들기 이동
      </button>
    </div>
  );
}
