import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import MyTrip from "./ui/MyTrip";
import Home from "./ui/Home"; // 기존 첫 화면 (AI Trip Mate)

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="p-4 bg-gray-800 flex justify-between">
        <Link to="/">🏠 홈</Link>
        <Link to="/mytrip">🧳 내 여행</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mytrip" element={<MyTrip />} />
      </Routes>
    </div>
  );
}
