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
    // min-h-screen -> w-full h-full 로 수정하여 App.js의 프레임 크기를 가득 채웁니다.
    // 배경색과 텍스트 색상은 유지합니다.
    <div className="w-full h-full flex flex-col items-center justify-start pt-16 bg-gray-900 text-white p-4">
      {/* p-4 (Padding)를 추가하여 프레임 경계와 요소 사이에 여백을 줍니다. */}
      
      <h1 className="text-3xl font-bold mb-4"> AI Trip Mate</h1>
      <p className="mb-8 text-base text-gray-300 text-center">
        여행지를 입력하고 AI가 일정을 만들어드릴게요!
      </p>

      <div className="flex flex-col gap-4 w-full px-8">
        {/* 버튼 너비를 부모 컨테이너에 맞춥니다. */}
        <button
          onClick={goToChatbot}
          className="bg-blue-600 hover:bg-blue-700 w-full px-6 py-3 rounded-lg text-white text-lg transition duration-150"
        >
          💬 여행지 추천 챗봇으로 이동
        </button>

        <button
          onClick={goToMyTrip}
          className="bg-green-500 hover:bg-green-600 w-full px-6 py-3 rounded-lg text-white text-lg transition duration-150"
        >
          🧳 내 여행 만들기 이동
        </button>
      </div>
    </div>
  );
}