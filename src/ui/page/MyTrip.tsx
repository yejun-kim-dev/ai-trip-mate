"use client";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  ChangeEvent,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MapPinOff,
  Plus,
  Camera,
  Pencil,
  Check,
  GripVertical,
} from "lucide-react";

import chatbotIcon from "../component/images/chatbot_icon.png";
import defaultTripImg from "../component/images/tripbasicimage.png";

/* ----------------------------
   1) 데이터 정규화 함수 (최상단)
------------------------------ */
const normalizeTripData = (t: any) => {
  if (!t) {
    return {
      id: null,
      userId: null,
      country: "",
      city: "",
      dateRange: { start: null, end: null, text: "" },
      companions: {},
      imageUrl: defaultTripImg,
      schedule: {},
    };
  }

  return {
    id: t.id,
    userId: t.userId ?? t.user_id,
    country: t.country || "",
    city: t.city || "",
    dateRange: {
      start: t.dateRange?.start ? new Date(t.dateRange.start) : null,
      end: t.dateRange?.end ? new Date(t.dateRange.end) : null,
      text: t.dateRange?.text || "",
    },
    companions: t.companions || {},
    imageUrl: t.imageUrl || defaultTripImg,
    schedule: t.schedule || {},
  };
};

/* -------------------------
   2) 메인 컴포넌트
--------------------------- */
export default function MyTrip() {
  // ===================================================
  // 🔥 [수정 1] 모든 Hooks는 컴포넌트 최상단에 위치해야 합니다.
  // ===================================================
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tripId = location.state?.id || null;
  const initialTripState = location.state?.tripData || null;

  const [tripData, setTripData] = useState<any | null>(null);
  const [schedule, setSchedule] = useState<any>({});
  const [tripImage, setTripImage] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const dragItem = useRef<{ day: number; index: number } | null>(null);
  // 드래그 로직을 위해 dragOverItem도 Hooks 영역으로 올립니다.
  const dragOverItem = useRef<{ day: number; index: number } | null>(
    null
  ); /* -------------------------
     6) DB 일정 → 로컬 일정 변환 함수 (useCallback)
       - tripData가 null일 수 있으므로 의존성 안전 처리
    --------------------------- */

  const convertDBItemsToSchedule = useCallback(
    (items: any[]) => {
      const newSchedule: any = {};

      // 🚨 tripData가 null일 경우, base Date를 설정할 수 없습니다.
      // 하지만 이 함수는 tripData가 로드된 후에만 호출되어야 합니다.
      // 현재 로직을 유지하며 tripData가 null일 때를 방지
      const startDate = tripData?.dateRange?.start;
      if (!startDate) return {};

      let base = new Date(startDate);
      base.setHours(0, 0, 0, 0);

      items.forEach((item) => {
        let day = 1;
        if (item.visit_date) {
          const v = new Date(item.visit_date);
          v.setHours(0, 0, 0, 0);
          const diff = Math.floor((v.getTime() - base.getTime()) / 86400000);
          day = diff + 1;
        }

        if (!newSchedule[day]) newSchedule[day] = [];
        newSchedule[day].push({
          id: item.id, // 🔥 [수정] item.name이 NULL/Undefined일 경우 popup_id를 사용
          name: item.name || `팝업 ID: ${item.popup_id}` || "장소명 없음", // DB에 없는 필드도 안전하게 처리
          location: item.address || "",
          period:
            item.period_start && item.period_end
              ? `${item.period_start} ~ ${item.period_end}`
              : "",
          time:
            item.open_time && item.close_time
              ? `${item.open_time} ~ ${item.close_time}`
              : "",
          lat: item.lat || null,
          lng: item.lng || null,
          category: item.category || "",
        });
      });

      return newSchedule;
    }, // 🔥 [수정 2-A] tripData가 null일 경우 에러가 나지 않도록 안전하게 처리합니다.
    [tripData?.dateRange?.start]
  ); /* -------------------------
   4) 최초 로딩: localStorage 또는 state 기반
  --------------------------- */

  useEffect(() => {
    if (!tripId) return;

    let saved = JSON.parse(localStorage.getItem("trips") || "[]");
    let storedTrip = saved.find((t: any) => String(t.id) === String(tripId));

    let normalized: any = null;

    // 🔥 [수정 1] location.state (initialTripState)를 최우선으로 사용합니다.
    if (initialTripState) {
      // location.state에 최신 정보가 있다면 바로 사용
      normalized = normalizeTripData(initialTripState);
    } else if (storedTrip) {
      // location.state가 없으면 localStorage 데이터 사용
      normalized = normalizeTripData(storedTrip);
    }

    if (!normalized) return;

    setTripData(normalized);
    setTripImage(normalized.imageUrl || defaultTripImg);

    // DB에서 일정이 로드되기 전까지는 localStorage에 있는 일정이라도 표시
    if (Object.keys(normalized.schedule || {}).length > 0) {
      setSchedule(normalized.schedule);
    }
  }, [tripId, initialTripState]); // 의존성 유지

  /* -------------------------
     7) 일정 DB에서 불러오기 (useEffect)
    --------------------------- */
  useEffect(() => {
    // 🔥 tripData가 null이 아닐 때만 실행
    if (!tripData || !tripData.id) return;

    async function fetchSchedule() {
      const res = await fetch("http://localhost:8000/api/get-trip-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: tripData.userId,
          tripId: tripData.id,
        }),
      });

      const json = await res.json();
      if (json.items) {
        setSchedule(convertDBItemsToSchedule(json.items));
      }
    }

    fetchSchedule();
  }, [tripData, tripId, convertDBItemsToSchedule]); // tripData를 의존성에 추가

  // useEffect for drag/schedule sync (Moved here)
  useEffect(() => {
    if (tripData?.schedule) {
      setSchedule(tripData.schedule);
    }
  }, [tripData]);

  // ===================================================
  // 🔥 [수정 3] 조건부 반환은 모든 Hooks 호출 이후에만 위치해야 합니다.
  // ===================================================

  if (!tripData) {
    return (
      <div className="p-10 text-center">
                  <MapPinOff className="w-8 h-8 text-gray-300 mb-4 mx-auto" /> 
                여행 정보를 불러올 수 없습니다.        {" "}
      </div>
    );
  }
  // ===============================
  // 🔥 편집 모드 & 드래그 상태
  // ==============================

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

    setSchedule((prev: any) => {
      const newSchedule: any = { ...prev };

      const sourceList = [...(newSchedule[source.day] || [])];
      if (!sourceList.length) return prev;

      const targetList =
        source.day === targetDay
          ? sourceList
          : [...(newSchedule[targetDay] || [])];

      const [movedItem] = sourceList.splice(source.index, 1);

      if (source.day === targetDay) {
        const safeIndex = Math.min(Math.max(targetIndex, 0), sourceList.length);
        sourceList.splice(safeIndex, 0, movedItem);
        newSchedule[source.day] = sourceList;
        dragItem.current = { day: source.day, index: safeIndex };
      } else {
        const safeIndex = Math.min(Math.max(targetIndex, 0), targetList.length);
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
      (t: any) => String(t.id) === String(tripData?.id)
    );

    if (idx !== -1) {
      trips[idx].schedule = schedule;
      localStorage.setItem("trips", JSON.stringify(trips));

      navigate(".", {
        state: { tripData: { ...trips[idx] } },
        replace: false,
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
      entries.map(([k, v]) => `${labelMap[k] || k} ${v}명`).join(", ") +
      "과 함께"
    );
  };

  // 날짜 계산
  const startDate = tripData.dateRange.start;
  const endDate = tripData.dateRange.end;
  const dayCount =
    startDate && endDate
      ? Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1
      : 0;

  const days =
    startDate && endDate
      ? Array.from({ length: dayCount }, (_, i) => {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          return {
            day: i + 1,
            date: `${d.getMonth() + 1}.${d.getDate()}`,
          };
        })
      : [];
  // =============================================
  // AI 일정 최적화 API 요청
  // =============================================
  async function handleGenerateAITrip() {
    if (!tripData) {
      alert("여행 정보가 없습니다.");
      return;
    }

    const userId = tripData.userId;
    const tripId = tripData.id;

    if (!tripData.dateRange.start || !tripData.dateRange.end) {
      alert("여행 날짜 정보가 잘못되었습니다.");
      return;
    }

    const s = new Date(tripData.dateRange.start);
    const tripStart = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(s.getDate()).padStart(2, "0")}`;

    const e = new Date(tripData.dateRange.end);
    const tripEnd = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(e.getDate()).padStart(2, "0")}`;

    try {
      const res = await fetch("/api/trip/optimize-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tripId, tripStart, tripEnd }),
      });

      const json = await res.json();

      console.log("👉 AI 서버 응답 전체:", json);

      // 🔥 핵심 수정 1: 서버는 schedule을 보낼 수도 있으므로 둘 다 대응
      const serverRoute = json.route || json.schedule;

      // 🔥 핵심 수정 2: route 자체가 없으면 에러 방지
      if (!serverRoute || Object.keys(serverRoute).length === 0) {
        alert("AI 일정 생성 실패: 서버에서 route/schedule을 받지 못했습니다.");
        return;
      }

      console.log("👉 사용되는 Route 데이터:", serverRoute);

      // 🔥 핵심 수정 3: 여기서 변환
      const newSchedule = convertRouteToLocalSchedule(serverRoute);

      setSchedule(newSchedule);

      // localStorage 반영
      const trips = JSON.parse(localStorage.getItem("trips") || "[]");
      const idx = trips.findIndex((t) => String(t.id) === String(tripId));
      if (idx !== -1) {
        trips[idx].schedule = newSchedule;
        localStorage.setItem("trips", JSON.stringify(trips));
      }

      alert("AI 일정이 생성되었습니다!");
    } catch (err) {
      console.error(err);
      alert("AI 최적화 중 오류 발생");
    }
  }

  // =============================================
  // 서버 route → MyTrip localSchedule 변환
  // route = { "2025-12-24": [...], "2025-12-25": [...] }
  // localSchedule = { 1: [...], 2: [...] }
  // =============================================
  function convertRouteToLocalSchedule(route) {
    const dates = Object.keys(route).sort();
    const schedule = {};

    dates.forEach((dateStr, index) => {
      const items = route[dateStr].map((it) => ({
        ...it,
        name: it.name || it.popup_name || it.title || "이름 없음",
        location: it.address || it.location || "",
        period:
          it.period_start && it.period_end
            ? `${it.period_start} ~ ${it.period_end}`
            : "",
      }));

      schedule[index + 1] = items;
    });

    return schedule;
  }

  /* -------------------------
     8) 이미지 업로드 저장 기능
  --------------------------- */
  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;

      setTripImage(base64);
      setTripData((prev: any) => ({ ...prev, imageUrl: base64 }));

      // localStorage 반영
      const trips = JSON.parse(localStorage.getItem("trips") || "[]");
      const idx = trips.findIndex(
        (t: any) => String(t.id) === String(tripData.id)
      );
      if (idx !== -1) {
        trips[idx].imageUrl = base64;
        localStorage.setItem("trips", JSON.stringify(trips));
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#F2F4F5] flex flex-col max-w-md mx-auto relative pb-60">
      {/* 상단 이미지 섹션 */}
      <div className="fixed top-0 left-0 w-full max-w-md h-[190px] z-50">
        <img
          src={tripImage || defaultTripImg}
          alt="여행 이미지"
          className="absolute top-0 inset-0 w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = defaultTripImg;
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
          type="button" // 🔥 필수: 명시적 버튼 타입 지정
          onClick={(e) => {
            e.stopPropagation(); // 이벤트 전파 방지
            navigate("/", { replace: true });
          }}
          className="absolute bottom-12 left-4 text-white p-2 rounded-full bg-transparent hover: transition duration-300 focus:outline-none 
          hover:border-none active:outline-none active:shadow-lg"
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
            const placesForDay = schedule[d.day] || [];

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
                          <div
                            className="w-5 h-5 bg-[#8bcafc] rounded-full flex items-center justify-center shadow-sm 
                                      hover:bg-[#7bc5ff] border-1 border-[#706F6F] active:scale-90 transition-all duration-200 cursor-pointer"
                          >
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
                      onClick={handleGenerateAITrip}
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
        type="button" // 🔥 필수
        onClick={(e) => {
          e.stopPropagation();

          // id가 유효한지 확인 후 이동
          if (tripData && tripData.id) {
            navigate("/chatbot", {
              state: {
                id: tripData.id, // ID도 보내고
                tripData: tripData, // 🔥 여행 데이터 전체 객체도 꼭 같이 보내야 함!
              },
              replace: false,
            });
          } else {
            alert("여행 정보를 찾을 수 없습니다.");
          }
        }}
        className="fixed bottom-9 right-8 rounded-full w-[62px] h-[62px] border-2  bg-white shadow-xl
        transition-all duration-100 focus:outline-none focus:ring-0 
                  active:scale-100 hover:bg-gray-50 hover:border-blue-400
                  flex items-center justify-center"
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
