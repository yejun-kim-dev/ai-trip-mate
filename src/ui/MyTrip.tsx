import { useEffect, useState } from "react";

interface Member {
  type: string;
  details: Record<string, number>;
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
  const [memberDetails, setMemberDetails] = useState<Record<string, number>>(
    {}
  );
  const [savedTrips, setSavedTrips] = useState<Trip[]>([]);

  // ✅ 나라 목록
  const countryList = [
    "대한민국",
    "일본",
    "미국",
    "중국",
    "프랑스",
    "영국",
    "독일",
    "캐나다",
    "호주",
  ];

  // ✅ 나라별 주요 도시
  const cityByCountry: Record<string, string[]> = {
    대한민국: [
      "서울특별시",
      "부산광역시",
      "대구광역시",
      "인천광역시",
      "광주광역시",
      "대전광역시",
      "울산광역시",
      "세종특별자치시",
      "경기도",
      "강원도",
      "충청북도",
      "충청남도",
      "전라북도",
      "전라남도",
      "경상북도",
      "경상남도",
      "제주특별자치도",
    ],
    일본: ["도쿄", "오사카", "교토", "후쿠오카", "삿포로"],
    미국: ["뉴욕", "로스앤젤레스", "시카고", "샌프란시스코", "라스베이거스"],
    중국: ["베이징", "상하이", "광저우", "청두"],
    프랑스: ["파리", "리옹", "마르세유"],
    영국: ["런던", "맨체스터", "리버풀"],
    독일: ["베를린", "뮌헨", "프랑크푸르트"],
    캐나다: ["토론토", "밴쿠버", "몬트리올"],
    호주: ["시드니", "멜버른", "브리즈번"],
  };

  const memberOptions = ["혼자", "연인", "친구", "가족", "반려견"];

  // ✅ 저장된 여행 목록 불러오기
  useEffect(() => {
    const data = localStorage.getItem("myTrips");
    if (data) setSavedTrips(JSON.parse(data));
  }, []);

  // ✅ 입력 변경
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "country") {
      setTrip({ ...trip, country: value, region: "", city: "" });
    } else {
      setTrip({ ...trip, [name]: value });
    }
  };

  // ✅ 동행자 세부정보 입력
  const handleMemberDetailChange = (key: string, value: number) => {
    setMemberDetails({ ...memberDetails, [key]: value });
  };

  // ✅ 동행자 추가
  const addMember = () => {
    if (!memberType) return;

    // 유형별 기본값 자동 설정
    let details: Record<string, number> = {};
    if (memberType === "혼자") details = { person_count: 1 };
    else if (memberType === "연인") details = { person_count: 2 };
    else details = { ...memberDetails };

    const newMember: Member = { type: memberType, details };

    // ✅ 최신 상태 기준으로 누적 저장
    setTrip((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
    }));

    // 입력창 초기화
    setMemberType("");
    setMemberDetails({});
  };

  // ✅ 여행 저장
  const saveTrip = () => {
    if (!trip.title || !trip.country) {
      alert("여행 제목과 나라를 입력해주세요!");
      return;
    }

    const updatedTrips = [...savedTrips, trip];
    setSavedTrips(updatedTrips);
    localStorage.setItem("myTrips", JSON.stringify(updatedTrips));

    alert("여행이 저장되었습니다!");
    setTrip({
      title: "",
      country: "",
      region: "",
      city: "",
      start_date: "",
      end_date: "",
      members: [],
    });
  };

  const availableCities = cityByCountry[trip.country] || [];

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6">🧳 내 여행</h1>

      {/* ✅ 저장된 여행 목록 */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-3">내가 저장한 여행 목록</h2>
        {savedTrips.length > 0 ? (
          <ul className="space-y-3">
            {savedTrips.map((t, i) => (
              <li
                key={i}
                className="p-3 bg-gray-800 rounded-lg shadow-sm flex justify-between"
              >
                <div>
                  <p className="text-lg font-semibold">{t.title}</p>
                  <p className="text-gray-400">
                    {t.country} / {t.region || t.city} ({t.start_date} ~{" "}
                    {t.end_date})
                  </p>
                  {t.members.length > 0 && (
                    <p className="text-gray-400 text-sm">
                      👥 동행자:{" "}
                      {t.members
                        .map(
                          (m) =>
                            `${m.type} (${Object.entries(m.details)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")})`
                        )
                        .join(" / ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">저장된 여행이 없습니다.</p>
        )}
      </div>

      {/* ✅ 새 여행 만들기 */}
      <div className="border-t border-gray-700 pt-6">
        <h2 className="text-2xl font-semibold mb-4">새 여행 만들기</h2>

        <input
          name="title"
          value={trip.title}
          onChange={handleChange}
          placeholder="여행 제목"
          className="p-2 text-black rounded mb-2 w-full"
        />

        {/* ✅ 나라 선택 */}
        <select
          name="country"
          value={trip.country}
          onChange={handleChange}
          className="p-2 text-black rounded mb-2 w-full"
        >
          <option value="">나라 선택</option>
          {countryList.map((country, index) => (
            <option key={index} value={country}>
              {country}
            </option>
          ))}
        </select>

        {/* ✅ 도시 선택 */}
        {trip.country && (
          <select
            name="region"
            value={trip.region}
            onChange={handleChange}
            className="p-2 text-black rounded mb-2 w-full"
          >
            <option value="">도시 선택</option>
            {availableCities.map((city, index) => (
              <option key={index} value={city}>
                {city}
              </option>
            ))}
          </select>
        )}

        {/* ✅ 동행자 유형 */}
        <div className="mt-4">
          <h3 className="text-lg mb-2">👥 동행자 추가</h3>
          <select
            value={memberType}
            onChange={(e) => setMemberType(e.target.value)}
            className="p-2 text-black rounded w-full mb-3"
          >
            <option value="">동행자 유형 선택</option>
            {memberOptions.map((type, i) => (
              <option key={i} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* ✅ 유형별 세부입력 */}
          {memberType === "혼자" && (
            <p className="text-gray-300 text-sm">혼자 여행입니다.</p>
          )}
          {memberType === "연인" && (
            <p className="text-gray-300 text-sm">두 분이 함께 여행합니다 💕</p>
          )}
          {memberType === "친구" && (
            <input
              type="number"
              min="1"
              placeholder="친구 수"
              className="p-2 text-black rounded w-full mb-2"
              onChange={(e) =>
                handleMemberDetailChange("friend_count", Number(e.target.value))
              }
            />
          )}
          {memberType === "반려견" && (
            <input
              type="number"
              min="1"
              placeholder="반려견 수"
              className="p-2 text-black rounded w-full mb-2"
              onChange={(e) =>
                handleMemberDetailChange("pet_count", Number(e.target.value))
              }
            />
          )}
          {memberType === "가족" && (
            <div className="flex flex-col gap-2">
              <input
                type="number"
                min="0"
                placeholder="부모님 수"
                className="p-2 text-black rounded"
                onChange={(e) =>
                  handleMemberDetailChange("parents", Number(e.target.value))
                }
              />
              <input
                type="number"
                min="0"
                placeholder="자녀 수"
                className="p-2 text-black rounded"
                onChange={(e) =>
                  handleMemberDetailChange("children", Number(e.target.value))
                }
              />
              <input
                type="number"
                min="0"
                placeholder="조부모님 수"
                className="p-2 text-black rounded"
                onChange={(e) =>
                  handleMemberDetailChange(
                    "grandparents",
                    Number(e.target.value)
                  )
                }
              />
              <input
                type="number"
                min="0"
                placeholder="형제/자매 수"
                className="p-2 text-black rounded"
                onChange={(e) =>
                  handleMemberDetailChange("sibling", Number(e.target.value))
                }
              />
            </div>
          )}

          <button
            onClick={addMember}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 mt-3"
          >
            추가
          </button>

          {/* ✅ 추가된 동행자 미리보기 */}
          {trip.members.length > 0 && (
            <div className="mt-4 bg-gray-800 p-3 rounded-lg">
              <h4 className="font-semibold mb-2">현재 추가된 동행자</h4>
              <ul className="space-y-1 text-gray-300 text-sm">
                {trip.members.map((m, i) => (
                  <li key={i}>
                    {m.type} →{" "}
                    {Object.entries(m.details)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 날짜 선택 */}
        <input
          name="start_date"
          type="date"
          value={trip.start_date}
          onChange={handleChange}
          className="p-2 text-black rounded mb-2 w-full mt-4"
        />
        <input
          name="end_date"
          type="date"
          value={trip.end_date}
          onChange={handleChange}
          className="p-2 text-black rounded mb-2 w-full"
        />

        <button
          onClick={saveTrip}
          className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 mt-4"
        >
          저장하기
        </button>
      </div>
    </div>
  );
}
