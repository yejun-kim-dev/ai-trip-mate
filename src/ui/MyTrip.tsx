import React, { useState } from "react";

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
      {/* 나머지 JSX 내용은 그대로 유지 */}
    </div>
  );
}
