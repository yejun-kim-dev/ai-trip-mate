import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  const goToMyTrip = () => {
    navigate("/mytrip");
  };

  const goToChatbot = () => {
    navigate("/chatbot");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-4">🌏 AI Trip Mate</h1>
      <p className="mb-8 text-lg text-gray-300">
        여행지를 입력하고 AI가 일정을 만들어드릴게요!
      </p>

      <div className="flex flex-col gap-4">
        <button
          onClick={goToChatbot}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white text-lg"
        >
          💬 여행지 추천 챗봇으로 이동
        </button>

        <button
          onClick={goToMyTrip}
          className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg text-white text-lg"
        >
          🧳 내 여행 만들기 이동
        </button>
      </div>
    </div>
  );
}
