import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export default function Chatbot() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>(
    []
  );
  const [input, setInput] = useState("");

  useEffect(() => {
    // 🌟 순차적으로 말풍선 등장 (0.3초 간격)
    const steps = [
      { delay: 300, text: "안녕하세요! 🌏 AI Trip Mate입니다." },
      { delay: 800, text: "여행지 추천을 도와드릴게요! ✈️" },
      { delay: 1300, text: "예:11월 3일~5일 간의 부산 여행 중 음식 관련한 팝업 있으면 추천해줘”  😊" },
    ];

    steps.forEach((step, i) => {
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "bot", text: step.text }]);
      }, step.delay);
    });
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // 예시 응답 (나중에 API 연결)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "좋아요! 잠시만 기다려주세요 😊" },
      ]);
    }, 500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white relative">
      {/* 💬 챗봇 상단 */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <div className="bg-blue-600 p-3 rounded-full shadow-lg animate-pulse">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-semibold">AI Trip Mate Chatbot</h1>
      </div>

      {/* 💭 대화 영역 */}
      <div className="flex-1 p-6 overflow-y-auto space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`my-2 ${
              msg.role === "user"
                ? "text-right text-blue-400"
                : "text-left text-gray-200"
            }`}
          >
            <div
              className={`inline-block px-4 py-3 rounded-2xl shadow-md ${
                msg.role === "user" ? "bg-blue-700" : "bg-gray-800"
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ✏️ 입력창 */}
      <div className="p-4 border-t border-gray-700 flex">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="여행지 추천을 받아보세요..."
          className="flex-1 p-3 rounded-xl bg-gray-800 text-white mr-2 outline-none focus:ring-2 focus:ring-blue-600"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-3 bg-blue-600 rounded-xl hover:bg-blue-700 transition-all"
        >
          보내기
        </button>
      </div>
    </div>
  );
}
