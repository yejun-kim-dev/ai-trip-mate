import React, { useState, useEffect } from "react";

interface Country {
  code: string;
  name: string;
  flag: string;
}

export default function SelectCountry({ setTripData, onClose }: any) {
  const [search, setSearch] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ API에서 국가 리스트 불러오기
  useEffect(() => {
    fetch("/api/countries")
      .then((res) => {
        if (!res.ok) throw new Error("서버 응답 오류");
        return res.json();
      })
      .then((data) => {
        // ⭐ 한국을 최상단으로 정렬
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
      
        // 🇰🇷 한국 이름 후보들
  const koreaNames = [
    "대한민국",
    "한국",
    "South Korea",
    "Republic of Korea",
    "Korea, Republic of"
  ];

  // 🇰🇷 한국 찾기 (띄어쓰기 제거 후 비교)
  const korea = sorted.find((c) =>
    koreaNames.some((name) =>
      c.name.replace(/\s+/g, "").includes(name.replace(/\s+/g, ""))
    )
  );

  const others = sorted.filter(
    (c) =>
      !koreaNames.some((name) =>
        c.name.replace(/\s+/g, "").includes(name.replace(/\s+/g, ""))
      )
  );

  setCountries(korea ? [korea, ...others] : sorted);
  setLoading(false);
})
      
      .catch((err) => {
        console.error("❌ 국가 API 불러오기 실패:", err);
        setError("국가 정보를 불러오지 못했습니다.");
        setLoading(false);
      });
  }, []);

  // ✅ 검색 필터 (대소문자 구분 없이)
  const filtered = countries.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-3 bg-white border border-[#D4D4D4] rounded-[10px] shadow-lg">
      {/* 검색창 */}
      <div className="flex items-center border border-[#8B8B8B] rounded-[10px] px-3 py-[6px] bg-white shadow-sm mb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#606060] mr-2"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="여행 국가 검색"
          className="w-full py-1 pl-2 rounded-[10px] border-none text-[14px] text-[#4B4B4B] focus:ring-0 focus:border-transparent focus:outline-none bg-transparent"
        />
      </div>

      {/* 로딩 / 에러 상태 */}
      {loading && (
        <p className="text-center text-gray-400 text-sm py-4">
          국가 목록을 불러오는 중...
        </p>
      )}
      {error && (
        <p className="text-center text-red-400 text-sm py-4">{error}</p>
      )}

      {/* 리스트 */}
      {!loading && !error && (
        <div className="mt-1 max-h-40 overflow-y-auto space-y-[1px]">
          {filtered.length > 0 ? (
            filtered.map((country) => (
              <button
                key={country.code}
                onClick={() => {
                  setTripData((prev: any) => ({
                    ...prev,
                    country: country.name,
                    flag: country.flag,
                  }));
                  onClose();
                }}
                className="w-full flex items-center space-x-3 py-[8px] px-3 rounded-lg bg-white hover:bg-gray-100 active:bg-gray-200 active:scale-[0.98] transition duration-150 text-left"
              >
                {/* ✅ 깃발 (API에서 받은 flag URL 사용) */}
                <img
                  src={country.flag}
                  alt={country.name}
                  className="w-[35px] h-[26px] object-cover rounded-[4px] border border-gray-200"
                />
                <span className="font-medium text-[#4B4B4B] text-[14px]">
                  {country.name}
                </span>
              </button>
            ))
          ) : (
            <p className="text-center text-gray-400 text-sm py-4">
              검색 결과가 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
