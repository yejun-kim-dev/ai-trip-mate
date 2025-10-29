import { useState } from "react";

interface Member {
  type: string;
  details: { count: number };
}

interface Trip {
  title: string;
  country: string;
  region: string;
  city: string;
  start_date: string;
  end_date: string;
  members: Member[];
}

export default function MyTrip() {
  const [trip, setTrip] = useState<Trip>({
    title: "",
    country: "",
    region: "",
    city: "",
    start_date: "",
    end_date: "",
    members: [],
  });

  const [memberType, setMemberType] = useState("");
  const [memberCount, setMemberCount] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTrip({ ...trip, [e.target.name]: e.target.value });
  };

  const addMember = () => {
    if (!memberType || !memberCount) return;
    setTrip({
      ...trip,
      members: [
        ...trip.members,
        { type: memberType, details: { count: parseInt(memberCount) } },
      ],
    });
    setMemberType("");
    setMemberCount("");
  };

  const handleSubmit = () => {
    console.log("저장된 여행 데이터:", trip);
    alert("✅ 여행 정보가 저장되었습니다!");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">🧳 내 여행 만들기</h1>

      <div className="bg-white p-6 rounded-2xl shadow-lg w-96 space-y-4">
        <input
          type="text"
          name="title"
          placeholder="여행 제목"
          onChange={handleChange} // ✅ 사용 중으로 인식
          className="w-full border p-2 rounded"
        />

        <input
          type="text"
          name="country"
          placeholder="나라"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          type="text"
          name="region"
          placeholder="지역"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          type="text"
          name="city"
          placeholder="도시"
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <div className="flex space-x-2">
          <input
            type="date"
            name="start_date"
            onChange={handleChange}
            className="border p-2 rounded w-1/2"
          />
          <input
            type="date"
            name="end_date"
            onChange={handleChange}
            className="border p-2 rounded w-1/2"
          />
        </div>

        <div className="flex space-x-2">
          <select
            value={memberType}
            onChange={(e) => setMemberType(e.target.value)}
            className="border p-2 rounded w-1/2"
          >
            <option value="">멤버 유형</option>
            <option value="혼자">혼자</option>
            <option value="연인">연인</option>
            <option value="친구">친구</option>
            <option value="가족">가족</option>
            <option value="반려견">반려견</option>
          </select>

          <input
            type="number"
            value={memberCount}
            onChange={(e) => setMemberCount(e.target.value)}
            placeholder="인원 수"
            className="border p-2 rounded w-1/2"
          />

          <button
            onClick={addMember} // ✅ 사용 중으로 인식
            className="bg-blue-500 text-white px-3 rounded"
          >
            ➕
          </button>
        </div>

        <button
          onClick={handleSubmit} // ✅ 사용 중으로 인식
          className="w-full bg-green-500 text-white py-2 rounded-lg"
        >
          여행 저장
        </button>
      </div>

      <div className="mt-6 w-96 text-left">
        <h2 className="font-semibold mb-2">📋 입력된 여행 정보</h2>
        <pre className="bg-gray-200 p-3 rounded text-sm">
          {JSON.stringify(trip, null, 2)}
        </pre>
      </div>
    </div>
  );
}
