import { useState, useEffect, useRef } from "react";

interface Message {
  role: "user" | "bot";
  text: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // 🔽 스크롤 자동 이동
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ 메시지 전송 함수
  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", text: input };
    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // ✅ 포트 1000 고정
      const res = await fetch("http://localhost:1000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      if (!res.ok) throw new Error(`서버 응답 실패 (${res.status})`);

      const data = await res.json();

      const botMessage: Message = {
        role: "bot",
        text: data.reply || "⚠️ Gemini 응답이 비어 있습니다.",
      };

      setMessages((prev: Message[]) => [...prev, botMessage]);
    } catch (error) {
      console.error("❌ Chat Error:", error);
      setMessages((prev: Message[]) => [
        ...prev,
        {
          role: "bot",
          text: "❌ 오류가 발생했습니다. 서버를 확인해주세요.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Enter 키 전송
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-blue-600 text-white p-4 text-center text-lg font-bold shadow-md">
        🌏 AI Trip Mate
      </header>

      {/* 채팅 영역 */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg: Message, i: number) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[75%] p-3 rounded-2xl shadow-md ${
                msg.role === "user"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-white text-gray-800 rounded-bl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-gray-500 text-sm animate-pulse">
            답변 생성 중...
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* 입력창 */}
      <footer className="flex items-center gap-2 p-3 bg-white border-t">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="여행 관련 질문을 입력하세요..."
          className="flex-1 border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={sendMessage}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 disabled:bg-gray-400"
        >
          보내기
        </button>
      </footer>
    </div>
  );
}
