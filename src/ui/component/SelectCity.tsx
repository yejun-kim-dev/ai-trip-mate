import React, { useState, useMemo, useEffect } from "react";
import axios from "axios"; // ✅ axios import 추가

interface SelectCityProps {
  setTripData: any;
  onClose: () => void;
  selectedCountry: string;
}

// ✅ 타입 정의 (도시 API 응답에 맞게)
interface City {
  name: string;
}

export default function SelectCity({
  setTripData,
  onClose,
  selectedCountry,
}: SelectCityProps) {
  const [search, setSearch] = useState("");
  const [cities, setCities] = useState<City[]>([]); // ✅ 도시 목록 상태 추가
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가

  // ✅ 선택된 국가가 변경될 때마다 서버에서 도시 목록을 불러오는 로직
  useEffect(() => {
    if (!selectedCountry) {
      setCities([]);
      return;
    }

    const fetchCities = async () => {
      setIsLoading(true);
      try {
        // 서버의 /api/cities 엔드포인트 호출
        const response = await axios.get(`/api/cities`, {
          params: { country: selectedCountry },
        });

        // 서버 응답 형태 ({ country: string, cities: string[] })를 City[] 형태로 변환
        const fetchedCities: City[] = response.data.cities.map((cityName: string) => ({
          name: cityName,
        }));

        setCities(fetchedCities);
      } catch (error) {
        console.error("❌ 도시 목록 불러오기 실패:", error);
        setCities([]); // 에러 시 목록 초기화
      } finally {
        setIsLoading(false);
      }
    };

    fetchCities();
  }, [selectedCountry]);

  // ✅ 검색 필터링된 도시 목록 (기존 cityDataByCountry 대신 fetched cities 사용)
  const filteredCities = useMemo(() => {
    if (!search) return cities;
    // 소문자로 변환 후 검색
    const lowerCaseSearch = search.toLowerCase();
    return cities.filter((city) => city.name.toLowerCase().includes(lowerCaseSearch));
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
          placeholder="여행 지역 검색"
          className="w-full py-1 pl-2 rounded-[10px] border-none text-[14px] focus:ring-0 focus:border-transparent focus:outline-none bg-transparent"
        />
      </div>

      {/* 로딩 상태 표시 */}
      {isLoading && (
        <p className="text-center text-gray-500 text-sm py-4">도시 목록을 불러오는 중...</p>
      )}

      {/* 지역 리스트 */}
      {!isLoading && (
        <div className="mt-1 max-h-40 overflow-y-auto space-y-[1px]">
          {filteredCities.map((city) => ( // ✅ filteredCities 사용
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

          {/* 검색 결과 및 데이터가 없을 때 */}
          {filteredCities.length === 0 && !isLoading && (
            <p className="text-center text-gray-400 text-sm py-4">
              {search 
                ? "검색 결과가 없습니다." 
                : "선택한 국가의 지역 정보가 없습니다."} 
            </p>
          )}
        </div>
      )}
    </div>
  );
}