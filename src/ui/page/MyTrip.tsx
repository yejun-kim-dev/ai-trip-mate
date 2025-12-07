"use client";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapPinOff, Plus, Camera, Pencil, Check, GripVertical } from "lucide-react";
import { TripState } from "../component/data/dummyTrips";
import chatbotIcon from "../component/images/chatbot_icon.png";
import defaultTripImg from "../component/images/tripbasicimage.png";

export default function MyTrip() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawTripData: TripState | undefined = location.state?.tripData;

  // 뒤로가기 핸들링
  useEffect(() => {
    const handlePopState = () => navigate("/", { replace: true });
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]);

  // 히스토리 정리
  useEffect(() => {
    if (location.state?.tripData) {
      window.history.replaceState({}, "", "/mytrip");
    }
  }, [location.state]);

  // 최신 데이터 동기화
  useEffect(() => {
    if (!rawTripData) return;
    const trips = JSON.parse(localStorage.getItem("trips") || "[]");
    const latestTrip = trips.find(
      (t: any) => String(t.id) === String(rawTripData.id)
    );
    if (!latestTrip) return;

    latestTrip.dateRange = {
      ...latestTrip.dateRange,
      start: latestTrip.dateRange.start ? new Date(latestTrip.dateRange.start) : null,
      end: latestTrip.dateRange.end ? new Date(latestTrip.dateRange.end) : null,
    };
    location.state = { tripData: latestTrip };
  }, [location.key]);

  // 데이터 정제
  // rawTrip: MyTrip → navigate에서 넘어온 값
const rawTrip = location.state?.tripData;

// 안전하게 tripData 정규화 (전체 구조 보존)
const tripData = rawTrip
  ? {
      ...rawTrip, // ⚠ 전체 필드를 보존하기 위해 반드시 필요

      id: rawTrip.id ?? rawTrip.tripNo ?? null,
      city: rawTrip.city ?? null,
      country: rawTrip.country ?? null,

      dateRange: rawTrip.dateRange
        ? {
            start: rawTrip.dateRange.start
              ? new Date(rawTrip.dateRange.start)
              : null,
            end: rawTrip.dateRange.end
              ? new Date(rawTrip.dateRange.end)
              : null,
            text: rawTrip.dateRange.text ?? "", // text까지 보존
          }
        : null,

      schedule: rawTrip.schedule ?? {}, // 🔥 schedule 유실 방지
      imageUrl: rawTrip.imageUrl ?? null,
      companions: rawTrip.companions ?? null,
    }
  : null;


  const DEFAULT_TRIP_IMAGE =
    typeof defaultTripImg === "string"
      ? defaultTripImg
      : (defaultTripImg as any).src || "";

  const [tripImage, setTripImage] = useState<string | null>(null);

  // 이미지 업로드
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setTripImage(base64);
      const trips = JSON.parse(localStorage.getItem("trips") || "[]");
      const idx = trips.findIndex(
        (t: any) =>
          String(t.id) === String(tripData?.id) ||
          String(t.tripNo) === String(tripData?.tripNo)
      );
      if (idx !== -1) {
        trips[idx].imageUrl = base64;
        localStorage.setItem("trips", JSON.stringify(trips));
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (tripImage === null) {
      setTripImage(
        tripData?.imageUrl && tripData.imageUrl !== ""
          ? tripData.imageUrl
          : DEFAULT_TRIP_IMAGE
      );
    }
  }, [tripData]);

  // ===============================
  // 🔥 편집 모드 & 드래그 상태
  // ===============================
  const [isEditMode, setIsEditMode] = useState(false);
  const [localSchedule, setLocalSchedule] = useState<any>(
    tripData?.schedule || {}
  );

  const dragItem = useRef<{ day: number; index: number } | null>(null);
  const dragOverItem = useRef<{ day: number; index: number } | null>(null);

  useEffect(() => {
    if (tripData?.schedule) {
      setLocalSchedule(tripData.schedule);
    }
  }, [tripData]);

  // 🖱️ 드래그 시작
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    day: number,
    index: number
  ) => {
    if (!isEditMode) return;
    dragItem.current = { day, index };
    // 일부 브라우저에서 드래그를 위해 data 설정 필요
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
    e.currentTarget.style.opacity = "0.5";
  };

  // 🖱️ 드래그 종료
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isEditMode) return;
    e.currentTarget.style.opacity = "1";
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // 🖱️ 드래그 진입 (순서/일차 변경 로직)
  const handleDragEnter = (
    e: React.DragEvent<HTMLDivElement>,
    targetDay: number,
    targetIndex: number
  ) => {
    if (!isEditMode) return;
    if (!dragItem.current) return;
    e.preventDefault();

    const source = dragItem.current;
    if (source.day === targetDay && source.index === targetIndex) return;

    setLocalSchedule((prev: any) => {
      const newSchedule: any = { ...prev };

      const sourceList = [...(newSchedule[source.day] || [])];
      if (!sourceList.length) return prev;

      const targetList =
        source.day === targetDay
          ? sourceList
          : [...(newSchedule[targetDay] || [])];

      const [movedItem] = sourceList.splice(source.index, 1);

      if (source.day === targetDay) {
        const safeIndex = Math.min(
          Math.max(targetIndex, 0),
          sourceList.length
        );
        sourceList.splice(safeIndex, 0, movedItem);
        newSchedule[source.day] = sourceList;
        dragItem.current = { day: source.day, index: safeIndex };
      } else {
        const safeIndex = Math.min(
          Math.max(targetIndex, 0),
          targetList.length
        );
        targetList.splice(safeIndex, 0, movedItem);
        newSchedule[source.day] = sourceList;
        newSchedule[targetDay] = targetList;
        dragItem.current = { day: targetDay, index: safeIndex };
      }

      dragOverItem.current = { day: targetDay, index: targetIndex };
      return newSchedule;
    });
  };

  // 💾 편집 완료(전체 저장)
  const handleSaveAll = () => {
    setIsEditMode(false);

    const trips = JSON.parse(localStorage.getItem("trips") || "[]");
    const idx = trips.findIndex(
      (t: any) =>
        String(t.id) === String(tripData?.id) ||
        String(t.tripNo) === String(tripData?.tripNo)
    );

    if (idx !== -1) {
      trips[idx].schedule = localSchedule;
      localStorage.setItem("trips", JSON.stringify(trips));

      navigate(".", {
        state: { tripData: { ...trips[idx] } },
        replace: true,
      });
    }

    alert("여행 일정이 저장되었습니다.");
  };

  // 예외 처리 UI
  if (!tripData)
    return (
      <div className="p-10 text-center">
        <MapPinOff className="w-8 h-8 text-gray-300 mb-4 mx-auto" />
        여행 정보가 없습니다.
      </div>
    );

  // 동반자 요약
  const getCompanionSummary = () => {
    if (!tripData.companions) return "혼자 여행";
    const entries = Object.entries(tripData.companions).filter(
      ([_, v]) => Number(v) > 0
    );
    if (entries.length === 0) return "혼자 여행";
    const labelMap: Record<string, string> = {
      friends: "친구",
      family: "가족",
      couple: "연인",
      youth: "청소년",
      children: "어린이",
      elderly: "노약자",
      others: "지인",
    };
    return (
      entries
        .map(([k, v]) => `${labelMap[k] || k} ${v}명`)
        .join(", ") + "과 함께"
    );
  };

  // 날짜 계산
  const startDate = tripData.dateRange.start;
  const endDate = tripData.dateRange.end;
  const isValidDate = startDate && endDate;
  const dayCount = isValidDate
    ? (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1
    : 0;
  const days =
    isValidDate && dayCount > 0
      ? Array.from({ length: dayCount }, (_, i) => {
          const date = new Date(startDate!);
          date.setDate(startDate!.getDate() + i);
          return {
            day: i + 1,
            date: `${String(date.getMonth() + 1).padStart(2, "0")}.${String(
              date.getDate()
            ).padStart(2, "0")}`,
          };
        })
      : [];

  return (
    <div className="min-h-screen bg-[#F2F4F5] flex flex-col max-w-md mx-auto relative pb-60">
      {/* 상단 이미지 섹션 */}
      <div className="fixed top-0 left-0 w-full max-w-md h-[190px] z-50">
        <img
          src={tripImage || DEFAULT_TRIP_IMAGE}
          alt="여행 이미지"
          className="absolute top-0 inset-0 w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_TRIP_IMAGE;
          }}
        />
        <div className="absolute top-0 inset-0 bg-gradient-to-t from-black/60 via-black/50 to-transparent" />
        <div className="absolute bottom-5 left-0 right-0 text-center text-white px-6">
          <h2 className="font-bold text-[20px] drop-shadow-md">
            {tripData.country} {tripData.city} 여행
          </h2>
          <p className="text-[14px] mt-1 opacity-90">
            {tripData.dateRange.text ||
              `${startDate?.toLocaleDateString()} ~ ${endDate?.toLocaleDateString()}`}
          </p>
          <p className="text-[14px] opacity-80">{getCompanionSummary()}</p>
        </div>

        {/* 카메라 버튼 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute top-5 right-5 bg-black/40 hover:bg-black/60 transition p-1.5 rounded-full backdrop-blur-sm"
        >
          <Camera className="w-5 h-5 text-white" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* 뒤로가기 버튼 */}
        <button
          onClick={() => navigate("/", { replace: true })}
          className="absolute bottom-12 left-4 text-white p-2 rounded-full bg-transparent hover:border-none active:outline-none active:shadow-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
        </button>
      </div>

      {/* 일차별 일정 리스트 */}
      <div className="flex flex-col gap-2 px-5 mt-[210px]">
        {days.length > 0 ? (
          days.map((d, index) => {
            const placesForDay = localSchedule[d.day] || [];

            return (
              <div
                key={d.day}
                className="bg-white rounded-xl shadow-sm p-3 border border-gray-100 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-baseline gap-1">
                    <p className="font-bold text-[#706F6F] text-[16px]">
                      {d.day}일차
                    </p>
                    <span className="text-[#706F6F] font-medium text-[14px]">
                      {d.date}
                    </span>

                    {/* 편집 / 완료 토글 (첫 날만) */}
                    {index === 0 && (
                      <button
                    onClick={() =>
                      isEditMode ? handleSaveAll() : setIsEditMode(true)
                    }
                    // 부모 버튼: 기본적인 위치 잡기 및 리셋
                    className="outline-none border-none p-1 translate-y-[6px] focus:outline-none focus:ring-0 active:outline-none bg-transparent"
                  >
                    {isEditMode ? (
                      // ✅ 수정됨: 체크 버튼 (반응형 애니메이션 추가)
                      // hover:bg-[#8bcafc] -> 마우스 올리면 조금 더 진한 하늘색
                      // active:scale-90 -> 클릭하면 살짝 작아지는 효과 (눌리는 느낌)
                      // transition-all -> 부드러운 전환
                      <div className="w-5 h-5 bg-[#8bcafc] rounded-full flex items-center justify-center shadow-sm 
                                      hover:bg-[#7bc5ff] border-1 border-[#706F6F] active:scale-90 transition-all duration-200 cursor-pointer">
                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                      </div>
                    ) : (
                      // 연필 아이콘: 기존과 동일하게 색상만 변경
                      <Pencil className="w-3.5 h-3.5 text-[#BDBDBD] hover:text-[#706F6F] transition-colors cursor-pointer" />
                    )}
                  </button>
                    )}
                  </div>

                  {/* AI 버튼 (편집 모드 아닐 때만) */}
                  {!isEditMode && index === 0 && (
                    <button
                      onClick={() => alert("AI 추천")}
                      className="px-3 py-1 rounded-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white text-[11px] font-bold shadow-sm"
                    >
                      AI 일정 생성
                    </button>
                  )}
                </div>

                <div className="relative flex flex-col gap-2 min-h-[50px]">
                  {/* 기본 세로선 (편집 모드에서는 살짝 깔끔하게 숨김 유지해도 OK) */}
                  {!isEditMode && placesForDay.length > 0 && (
                    <div className="absolute left-2.5 top-5 bottom-2 w-0.5 bg-[#D9D9D9] z-0" />
                  )}

                  {placesForDay.map((place: any, pIndex: number) => (
                <div
                  key={place.id || pIndex}
                  className={`relative transition-all duration-200 ${
                    isEditMode ? "pl-2 cursor-move" : "pl-10"
                  }`}
                  draggable={isEditMode}
                  onDragStart={(e) => handleDragStart(e, d.day, pIndex)}
                  onDragEnter={(e) => handleDragEnter(e, d.day, pIndex)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => {
                    if (isEditMode) e.preventDefault();
                  }}
                >
                  {/* 편집 모드: 그립 아이콘 / 기본 모드: 원래 번호 동그라미 디자인 그대로 */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center ${
                      isEditMode
                        ? "left-3 w-5 h-5 text-gray-400"
                        : "-left-0 w-5 h-5 bg-[#007AFF] rounded-full text-[#FFFDFD] font-bold text-[14px] ring-4 ring-white"
                    }`}
                  >
                    {isEditMode ? (
                      <GripVertical className="w-4 h-4" />
                    ) : (
                      pIndex + 1
                    )}
                  </div>

                  {/* 장소 카드 */}
                  <div
                    className={`flex flex-col items-start bg-[#F8FAFC] border border-gray-200 -mx-1 rounded-lg text-left ${
                      isEditMode
                        ? "pl-8 pr-2 py-2 bg-white shadow-sm border-blue-200"
                        : "px-3 py-2"
                    }`}
                  >
                    <p className="text-[13px] font-semibold text-[#706F6F] leading-snug">
                      {place.name}
                    </p>
                    {(place.period || place.time) && (
                      <p className="text-[12px] font-medium text-[#706F6F]">
                        📅{" "}
                        {place.period && place.time
                          ? `${place.period} / ${place.time}`
                          : place.period || place.time}
                      </p>
                    )}
                    {place.location && (
                      <p className="text-[12px] font-medium text-[#706F6F]">
                        📍 {place.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}


                  {/* 장소 추가 (편집 모드 아닐 때만) */}
                  {!isEditMode && (
                    <div className="relative pl-10 z-0 mt-1">
                      <div className="absolute -left-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center ring-4 ring-white">
                        <Plus className="w-3 h-3 text-gray-400" />
                      </div>
                      <button
                        onClick={() => alert(`${d.day}일차 장소 추가`)}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-1 text-[#706F6F] text-[14px] bg-white hover:border-blue-400 hover:text-blue-500 transition"
                      >
                        장소 추가
                      </button>
                    </div>
                  )}

                  {/* 편집 모드일 때 빈 날짜 드롭 영역 */}
                  {isEditMode && placesForDay.length === 0 && (
                    <div
                      className="h-12 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400"
                      onDragEnter={(e) => handleDragEnter(e, d.day, 0)}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      여기로 일정을 끌어오세요
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-400 text-center mt-8">
            여행 날짜 정보가 없습니다.
          </p>
        )}
      </div>

      {/* 챗봇 버튼 */}
      <button
        onClick={() => {
          const trips = JSON.parse(localStorage.getItem("trips") || "[]");
          const foundTrip = trips.find(
            (t: any) => String(t.id) === String(tripData.id)
          );
          navigate("/chatbot", {
  state: {
    tripData: {
      ...foundTrip,
      dateRange: foundTrip.dateRange ? {
        start: foundTrip.dateRange.start ? new Date(foundTrip.dateRange.start) : null,
        end: foundTrip.dateRange.end ? new Date(foundTrip.dateRange.end) : null,
        text: foundTrip.dateRange.text ?? "",
      } : null
    }
  },
  replace: true
});

        }}
        className="fixed bottom-9 right-8 rounded-full w-[62px] h-[62px] border-2 border-dashed border-gray-300 bg-white shadow-xl hover:bg-gray-50 flex items-center justify-center"
      >
        <img
          src={chatbotIcon}
          alt="AI 챗봇"
          className="w-[84%] h-[84%] object-contain rounded-full scale-[8] translate-y-[4%]"
        />
      </button>
    </div>
  );
}
