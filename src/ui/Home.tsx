import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center bg-white">
      <h1 className="text-3xl font-bold mb-4 text-gray-800">🌏 AI Trip Mate</h1>
      <p className="text-gray-600 mb-6">여행 계획을 도와드릴게요 ✈️</p>

      <Link to="/chatbot">
        <button className="bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition">
          🤖 챗봇 시작하기
        </button>
      </Link>
    </div>
  );
}
