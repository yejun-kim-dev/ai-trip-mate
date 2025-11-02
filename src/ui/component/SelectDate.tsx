import React, { useState } from "react";

interface SelectDateProps {
  setTripData: any;
  onClose: () => void;
}

export default function SelectDate({ setTripData, onClose }: SelectDateProps) {
  const today = new Date();
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);

  // 날짜 클릭 핸들러
  const handleDateClick = (date: Date) => {
    // 날짜의 시간 정보를 제거하고 비교
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startOnly = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()) : null;

    if (!startOnly || (startOnly && end)) {
      setStart(dateOnly);
      setEnd(null);
    } else if (startOnly && !end) {
      if (dateOnly.getTime() > startOnly.getTime()) setEnd(dateOnly);
      else {
        setStart(dateOnly);
        setEnd(null);
      }
    }
  };

  // 선택 상태 관련
  const isSelected = (date: Date) => {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const startOnly = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : null;
    const endOnly = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() : null;

    if (!startOnly) return false;
    if (startOnly && !endOnly) return dateOnly === startOnly;
    if (startOnly && endOnly) return dateOnly >= startOnly && dateOnly <= endOnly;
    return false;
  };

  const isStart = (date: Date) => start && new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() === new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const isEnd = (date: Date) => end && new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() === new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

  // 월 렌더링
  const renderMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay(); // 0: 일요일, 6: 토요일
    const days = [];

    // 빈칸 (이전 달 날짜)
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-[14.28%] h-9" />);
    }

    // 날짜 렌더링
    // 날짜 렌더링
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const currentDate = new Date(year, month, d);
      const selected = isSelected(currentDate);
      
      // 1. Outer wrapper: 기간 내 연속 배경 제거 (원형 디자인 요청 반영)
      const wrapperClasses = `relative flex justify-center items-center py-[2px] px-[2px] h-8 w-8`;

      // 2. Inner dayClasses: 선택 상태에 따라 완전한 원형 적용
      let dayClasses = "w-full h-full flex items-center justify-center font-medium cursor-pointer text-[15px]";
      
      if (selected) { // 시작일, 종료일, 기간 내 모든 날짜가 선택된 경우
        dayClasses += " bg-[#319CE5] text-white rounded-full"; // 🎯 모든 선택 날짜를 완전한 원형으로
      } else { // 미선택 날짜
        dayClasses += " text-[#505050] hover:bg-gray-100 rounded-full";
      }

      days.push(
        <div
          key={d}
          className={wrapperClasses}
          onClick={() => handleDateClick(currentDate)}
        >
          <div className={dayClasses}>
            {d}
          </div>
        </div>
      );
    }

    return (
      <div className="w-full mb-4">
        {/* 🎯 요청 수정 사항: 년/월 헤더 (px-4 패딩, border-b 가로줄 추가) */}
        <div className="border-b border-gray-200 mb-2 pb-2"> {/* 가로줄 */}
          <h3 style={{ fontSize: '18px' }} className="font-semibold text-[#505050] text-left px-1"> 
            {year}년 {month + 1}월
          </h3>
        </div>
        {/* 요일 헤더 */}
        <div style={{ fontSize: '14px' }} className="flex text-[#505050] mb-1 font-medium">
          {["일", "월", "화", "수", "목", "금", "토"].map((d, index) => (
            <div key={d} className={`w-[14.28%] text-center ${index === 0 ? 'text-red-500' : ''}`}>
              {d}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap">{days}</div> {/* 날짜 컨테이너에도 패딩 적용 */}
      </div>
    );
  };

  // 여행 생성 클릭
  const handleConfirm = () => {
    if (!start || !end) return;

    const format = (d: Date) =>
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
        d.getDate()
      ).padStart(2, "0")}`;

    const dateText = `${format(start)} ~ ${format(end)}`;

    setTripData((prev: any) => ({
      ...prev,
      dateRange: { start, end, text: dateText },
    }));
    onClose();
  };

  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  return (
    <div className="p-3 bg-white border border-[#D4D4D4] rounded-[10px] shadow-lg mb-6 mx-auto w-[96%] max-w-md mt-4 relative z-30">
      {/* 검색창과 비슷한 형태의 상단 입력 느낌 */}
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
          readOnly
          value="여행 날짜 선택"
          className="w-full py-1 pl-2 rounded-[10px] border-none text-[14px] focus:ring-0 focus:border-transparent focus:outline-none bg-transparent text-[#4B4B4B]"
        />
      </div>

      {/* 캘린더 본체 */}
      <div
        className="bg-white p-3 rounded-[10px] border border-gray-200 shadow-sm overflow-y-auto"
        style={{
          maxHeight: "360px",
          width: "96%",
          margin: "0 auto",
        }}
      >
        {renderMonth(today.getFullYear(), today.getMonth())}
        {renderMonth(nextMonth.getFullYear(), nextMonth.getMonth())}
      </div>

      {/* 버튼 */}
      <div className="flex justify-center mt-3">
        <button
          onClick={handleConfirm}
          disabled={!start || !end}
          className={`w-[80%] py-2 rounded-full font-semibold text-white text-[15px] shadow-md transition duration-300 ${
            !start || !end
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-gradient-to-r from-[#319CE5] to-[#65E0FF] hover:opacity-90"
          }`}
        >
          선택 완료
        </button>
      </div>
    </div>
  );
}