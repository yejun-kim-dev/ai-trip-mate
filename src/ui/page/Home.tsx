import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import tripimage_sampleImg from "../component/images/tripimage_sample.jpg";
import tripbox_sampleImg from "../component/images/tripbox_sample.jpg";
// import tripbox from "../component/images/tripbox.png"; // tripbox.png 대신 tripimage_sampleImg를 배경으로 사용하므로 제거

interface Trip {
  id: number;
  title: string;
  dateRange: string;
  companions: string;
  imageUrl: string; // 썸네일 이미지 URL
}

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const navigate = useNavigate();

  // ✅ 예시 데이터 (나중에 Firestore 연결 예정)
  useEffect(() => {
    const storedTrips = [
      {
        id: 1,
        title: "부산 여행",
        dateRange: "2025.12.23 - 12.26",
        companions: "친구 1명과 함께",
        imageUrl: tripimage_sampleImg,
      },
      // ✅ 완성 이미지처럼 다른 예시 데이터를 추가했습니다.
      {
        id: 2,
        title: "제주도 가족 여행",
        dateRange: "2024.08.10 - 08.15",
        companions: "가족 3명과 함께",
        imageUrl: tripbox_sampleImg, // 실제 앱에서는 다른 이미지 사용
      },
    ];
    setTrips(storedTrips);
  }, []);

  const handleCreateTrip = () => {
    console.log("새 여행 만들기 클릭");
    
    // 🎯 3. '새 여행 만들기' 버튼 클릭 시 /mytrip 경로로 이동합니다.
    navigate('/mytrip'); 
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#FFFDFD] p-4">
      {/* 헤더 */}
      <div className="w-full flex justify-between items-center mb-6 mt-6 px-4 pl-2">
        <h1 className="font-bold text-[#319CE5] text-[24px]">내 여행</h1>
        <button className="text-[#4B4B4B] text-[30px] bg-transparent border-none p-0">☰</button>
      </div>

      {/* --- */}

      {/* 여행 목록 */}
      <div className="w-full flex flex-col items-center gap-3 mb-8">
        {trips.length > 0 ? (
          trips.map((trip) => (
            <div
              key={trip.id}
              className="relative w-[96%] max-w-[420px] h-[150px] rounded-xl shadow-xl overflow-hidden cursor-pointer transform transition duration-300 hover:scale-[1.02]"
            >
              {/* ✅ 배경 이미지 (썸네일) */}
              <img
                src={trip.imageUrl}
                alt={trip.title}
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* ✅ 이미지 위에 어둡게 만드는 오버레이 (텍스트 가독성 향상) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10"></div>
              
              {/* ✅ 내부 텍스트 - 하단에 배치 */}
              <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col justify-end text-white">
                <div className="flex justify-between items-end w-full">
                  <div className="flex flex-col items-start"> 
                    <h2 className="font-extrabold text-[24px] leading-tight mb-1">
                      {trip.title}
                    </h2>
                    <p className="text-[15px] font-medium leading-tight opacity-90">
                      {trip.dateRange}
                    </p>
                  </div>  
                  {/* ✅ 동행자 정보 (오른쪽 상단 -> 오른쪽 하단으로 이동, 디자인에 따라) */}
                  <p className="text-[14px] font-light opacity-80 whitespace-nowrap">
                    {trip.companions}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-[#B0B0B0] mt-20 text-[14px]">
            아직 등록된 여행이 없습니다.
          </p>
        )}
      </div>

      {/* --- */}

      {/* 하단 버튼 */}
      <button
  onClick={handleCreateTrip}
  className="fixed bottom-12 bg-gradient-to-r from-[#319CE5] to-[#65E0FF] text-white font-semibold px-7 py-2.5 rounded-full shadow-lg text-[16px] 
  hover:from-[#2474b0] hover:to-[#52c0d9] transition duration-300 focus:outline-none 
  hover:border-none active:outline-none active:shadow-lg"
>
  새 여행 만들기
</button>
    </div>
  );
}