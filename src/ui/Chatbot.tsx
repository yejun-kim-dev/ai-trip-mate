import { useState } from "react";

type Message = {
  role: "user" | "bot";
  text: string;
};

export default function Chatbot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: "user" as const, text: input }];
    setMessages(newMessages);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
    } catch (err) {
      console.error("Error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "⚠️ 서버 오류가 발생했어요." },
      ]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4 text-blue-700">AI Trip Mate ✈️</h1>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-4 h-[500px] overflow-y-auto mb-4">
        {messages.map((m, _i) => (
          <div
            key={_i}
            className={`p-3 my-2 rounded-xl max-w-[80%] ${
              m.role === "user"
                ? "bg-blue-500 text-white self-end ml-auto"
                : "bg-gray-200 text-black self-start mr-auto"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="flex w-full max-w-lg">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="여행 관련 질문을 입력하세요..."
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2 mr-2"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
        >
          보내기
        </button>
      </div>
    </div>
  );
}
