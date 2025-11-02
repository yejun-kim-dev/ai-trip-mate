import React, { useState } from "react";

const countryData = [
  { code: "KR", name: "대한민국", flag: "🇰🇷" },
  { code: "GH", name: "가나", flag: "🇬🇭" },
  { code: "GA", name: "가봉", flag: "🇬🇦" },
  { code: "US", name: "미국", flag: "🇺🇸" },
  { code: "JP", name: "일본", flag: "🇯🇵" },
];

export default function SelectCountry({ setTripData, onClose }: any) {
  const [search, setSearch] = useState("");

  return (
    <div className="p-3 bg-white border border-[#D4D4D4] rounded-[10px] shadow-lg mb-6 mx-auto w-[90%] max-w-md mt-4 relative z-30">

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
          className="text-[#8B8B8B] mr-2"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="여행 국가 검색"
          className="w-full py-1 pl-2 rounded-[10px] border-none text-[14px] focus:ring-0 focus:border-transparent focus:outline-none bg-transparent"
        />
      </div>

      {/* 리스트 */}
      <div className="mt-1 max-h-40 overflow-y-auto space-y-[1px]">
        {countryData
          .filter((c) => c.name.includes(search))
          .map((country) => (
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
              <img
                src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                alt={country.name}
                className="w-[35px] h-[26px] object-cover rounded-[4px] border border-gray-200"
              />
              <span className="font-medium text-[#4B4B4B] text-[14px]">
                {country.name}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
