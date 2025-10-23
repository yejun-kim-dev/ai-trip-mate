import { useState } from "react";

function App() {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(1);
  const [plan, setPlan] = useState("");

  const generatePlan = async () => {
    const res = await fetch("/api/plan?dest=" + destination + "&days=" + days);
    const data = await res.json();
    setPlan(data.plan);
  };

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>🧭 AI Trip Mate</h1>
      <p>여행지를 입력하고 AI가 일정표를 만들어드릴게요!</p>
      <input
        type="text"
        placeholder="예: 서울, 제주, 도쿄"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
      />
      <br />
      <input
        type="number"
        min="1"
        value={days}
        onChange={(e) => setDays(parseInt(e.target.value))}
      />
      <br />
      <button onClick={generatePlan}>AI 여행 일정 생성</button>

      {plan && (
        <div style={{ marginTop: "20px" }}>
          <h2>여행 일정 ✈️</h2>
          <pre>{plan}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
