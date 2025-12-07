import React, { useState, useMemo } from "react";
// ✅ axios 삭제
// import axios from "axios"; 

// ✅ 로컬 데이터 import 
// 파일 경로: src/components/SelectCity.tsx -> src/utils/citiesByCountry.js (한 단계 위로 가서 utils로 진입)
import { citiesByCountry } from "../../../utils/citiesByCountry";


interface SelectCityProps {
  setTripData: any;
  onClose: () => void;
  selectedCountry: string;
}

interface City {
  name: string;
}

export default function SelectCity({
  setTripData,
  onClose,
  selectedCountry,
}: SelectCityProps) {
  const [search, setSearch] = useState("");
  // ❌ 로딩 상태 불필요

  // ✅ 선택된 국가에 해당하는 도시 목록 가져오기
  // JS 파일이라 타입 추론이 안 될 수 있으므로 any 혹은 타입 단언 사용
  // citiesByCountry 객체에서 selectedCountry 키로 배열을 찾음
  const rawCities = (citiesByCountry as any)[selectedCountry] || [];
  
  const cities: City[] = useMemo(() => {
    return rawCities.map((cityName: string) => ({ name: cityName }));
  }, [selectedCountry, rawCities]);

  // ✅ 검색 필터링 로직
  const filteredCities = useMemo(() => {
    if (!search) return cities;
    const lowerCaseSearch = search.toLowerCase();
    return cities.filter((city) => 
      city.name.toLowerCase().includes(lowerCaseSearch)
    );
  }, [cities, search]);

  return (
    <div className="p-3 bg-white border border-[#D4D4D4] rounded-[10px] shadow-lg mb-3 mx-auto w-[100%] max-w-md mt-4 relative z-30">
      
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
          placeholder={selectedCountry ? `${selectedCountry} 지역 검색` : "지역 검색"}
          className="w-full py-1 pl-2 rounded-[10px] border-none text-[14px] focus:ring-0 focus:border-transparent focus:outline-none bg-transparent"
        />
      </div>

      {/* 지역 리스트 */}
      <div className="mt-1 max-h-40 overflow-y-auto space-y-[1px]">
        {filteredCities.map((city) => (
          <button
            key={city.name}
            onClick={() => {
              setTripData((prev: any) => ({
                ...prev,
                city: city.name,
              }));
              onClose();
            }}
            className="w-full flex items-center space-x-3 py-[8px] px-3 rounded-lg bg-white hover:bg-gray-100 active:bg-gray-200 active:scale-[0.98] transition duration-150 text-left"
          >
            <span className="text-[18px]">📍</span>
            <span className="font-medium text-[#4B4B4B] text-[14px]">
              {city.name}
            </span>
          </button>
        ))}

        {/* 데이터가 없을 때 */}
        {filteredCities.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-4">
            {search 
              ? "검색 결과가 없습니다." 
              : `${selectedCountry}의 도시 정보가 없습니다.`} 
          </p>
        )}
      </div>
    </div>
  );
}