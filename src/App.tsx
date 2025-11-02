import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./ui/page/Home";
import MyTrip from "./ui/page/MyTrip";
import Chatbot from "./ui/page/Chatbot";

export default function App() {
  console.log("✅ App.tsx Loaded!");

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <main className="flex-grow">
        <Routes>
          {/* 👇 기본 '/' 경로로 들어올 때 자동으로 '/chatbot'으로 이동 */}
          <Route path="/" element={<Navigate to="/chatbot" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/mytrip" element={<MyTrip />} />
          <Route path="/chatbot" element={<Chatbot />} />
        </Routes>
      </main>
    </div>
  );
}
