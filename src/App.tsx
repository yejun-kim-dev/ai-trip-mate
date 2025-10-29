import { Routes, Route, Link } from "react-router-dom";
import MyTrip from "./ui/MyTrip";
import Home from "./ui/Home";
import Chatbot from "./ui/Chatbot";

export default function App() {
  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      {/* ✅ 왼쪽 사이드바 */}
      <nav className="w-60 bg-gray-800 flex flex-col justify-start p-6">
        <h1 className="text-xl font-bold mb-8 text-center">AI Trip Mate</h1>
        <div className="flex flex-col gap-4">
          <Link
            to="/"
            className="hover:bg-gray-700 p-2 rounded transition-all duration-200"
          >
            🏠 홈
          </Link>
          <Link
            to="/mytrip"
            className="hover:bg-gray-700 p-2 rounded transition-all duration-200"
          >
            🧳 내 여행
          </Link>
          <Link
            to="/chatbot"
            className="hover:bg-gray-700 p-2 rounded transition-all duration-200"
          >
            💬 챗봇
          </Link>
        </div>
      </nav>

      {/* ✅ 오른쪽 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col justify-center items-center p-10 bg-gray-900 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mytrip" element={<MyTrip />} />
          <Route path="/chatbot" element={<Chatbot />} />
        </Routes>
      </main>
    </div>
  );
}
