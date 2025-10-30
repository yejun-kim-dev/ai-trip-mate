"use client";
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
// =================================================================
// 📚 임시 데이터 (실제 앱에서는 API 호출로 대체)
// =================================================================

// 2단계: 국가 검색 예시
const countryData = [
  { code: 'KR', name: '대한민국', flag: '🇰🇷' },
  { code: 'GH', name: '가나', flag: '🇬🇭' }, 
  { code: 'GA', name: '가봉', flag: '🇬🇦' }, 
  { code: 'US', name: '미국', flag: '🇺🇸' },
  { code: 'JP', name: '일본', flag: '🇯🇵' },
];

// 3단계: 도시 검색 예시
const cityData = [
  { name: '서울', icon: '🏙️' },
  { name: '부산', icon: '🏖️' },
  { name: '제주', icon: '🍊' },
];

// 5단계: 동반자 목록
const companionData = [
  { key: 'friends', label: '친구', defaultCount: 0 },
  { key: 'family', label: '가족', defaultCount: 0 },
  { key: 'couple', label: '연인', defaultCount: 0 },
  { key: 'others', label: '기타', defaultCount: 0 },
];

// =================================================================
// 📋 상태 인터페이스
// =================================================================

interface Companions {
  [key: string]: number;
}

interface TripState {
  country: string;
  flag?: string;  // ✅ 국기 이모지나 이미지 URL 저장
  city: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  companions: Companions;
}


// =================================================================
// ✨ 메인 컴포넌트: MyTrip
// =================================================================

export default function MyTrip() {
  // 1단계는 '여행 정보 개요' 화면, 2단계부터 순차적인 입력 (국가 -> 도시 -> 날짜 -> 동반자)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const initialTripState = {
    country: '',
    city: '',
    dateRange: { start: null, end: null },
    companions: companionData.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.defaultCount }), {}),
  }
  const [tripData, setTripData] = useState<TripState>(initialTripState);
const navigate = useNavigate();
  
  // 이전 단계로 이동 (X 버튼 및 외부 클릭 시 step 1로 돌아가는 용도로 사용됨)
  const handleBack = useCallback(() => {
  if (step > 1) {
    setStep(step - 1);
    setSearchQuery(''); 
  } else {
   console.log("여행 생성 취소 및 홈으로 이동");
    navigate('/'); 
  }
}, [step, navigate]);

  // 다음 단계로 이동 (주로 검색/선택 화면에서 사용)
  const handleNext = useCallback((nextStep: number, data: Partial<TripState> = {}) => {
    setTripData(prev => ({ ...prev, ...data }));
    if (nextStep < 6) {
      setStep(nextStep);
      setSearchQuery(''); // 검색어 초기화
    }
  }, []);

  // 동반자 수 변경 핸들러 (5단계)
  const handleCompanionChange = useCallback((key: string, delta: 1 | -1) => {
    setTripData(prev => {
      const currentCount = prev.companions[key];
      const newCount = Math.max(0, currentCount + delta); // 0 미만 방지
      return {
        ...prev,
        companions: { ...prev.companions, [key]: newCount },
      };
    });
  }, []);

  // 여행 생성 완료 로직 (step 5에서 호출)
  const handleCreateTrip = () => {
    setLoading(true);
    console.log("최종 여행 데이터:", tripData);
    
    // 임시로 2초 후 로딩 해제 (실제 API 호출 시간)
    setTimeout(() => {
        setLoading(false);
        // alert('여행 생성이 완료되었습니다!'); 
        // 실제로는 여기서 메시지 표시 후 navigate
    }, 2000);
  };
  
  // =================================================================
  // 📅 캘린더 로직 (4단계) - 기존 로직 유지
  // =================================================================

  // 날짜가 선택된 범위에 포함되는지 확인
  const isDateSelected = useCallback((date: Date): boolean => {
    const start = tripData.dateRange.start;
    const end = tripData.dateRange.end;
    
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const startOnly = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : null;
    const endOnly = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() : null;

    if (startOnly && endOnly) {
      return dateOnly >= startOnly && dateOnly <= endOnly;
    }
    return startOnly === dateOnly;
  }, [tripData.dateRange.start, tripData.dateRange.end]);

  // 날짜 클릭 핸들러
  const handleDateClick = useCallback((date: Date) => {
    // 시간 정보를 제거하고 날짜만 비교
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const start = tripData.dateRange.start;
    const end = tripData.dateRange.end;

    if (!start || (start && end)) {
      // 1. 시작 날짜가 없거나, 기간이 이미 선택되었을 경우 -> 시작 날짜로 재설정
      setTripData(prev => ({ ...prev, dateRange: { start: dateOnly, end: null } }));
    } else if (start && !end && dateOnly.getTime() > start.getTime()) {
      // 2. 시작 날짜만 있고, 선택된 날짜가 시작 날짜보다 클 경우 -> 종료 날짜로 설정
      setTripData(prev => ({ ...prev, dateRange: { start, end: dateOnly } }));
    } else {
      // 3. 선택된 날짜가 시작 날짜보다 작거나 같을 경우 -> 시작 날짜 재설정 (기간 초기화)
      setTripData(prev => ({ ...prev, dateRange: { start: dateOnly, end: null } }));
    }
  }, [tripData.dateRange.start, tripData.dateRange.end]);

  const renderMonth = (date: Date) => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const startingDay = firstDayOfMonth.getDay(); // 0(일) ~ 6(토)
    
    const days = [];
    // 이전 달 공백
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`prev-${i}`} className="w-[14.28%] p-1"></div>);
    }
    // 이번 달 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(date.getFullYear(), date.getMonth(), i);
      const isToday = currentDate.toDateString() === new Date().toDateString();
      const isSelected = isDateSelected(currentDate);
      const isStart = tripData.dateRange.start?.getTime() === new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();
      const isEnd = tripData.dateRange.end?.getTime() === new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();

      let dayClasses = "w-[14.28%] p-1 text-center font-medium cursor-pointer relative z-10";
      
      if (isStart && isEnd) { // 시작일과 종료일이 같음 (1일 여행)
        dayClasses += " bg-[#319CE5] text-white rounded-full"; 
      } else if (isStart) { // 기간 시작일
        dayClasses += " bg-[#319CE5] text-white rounded-l-full";
      } else if (isEnd) { // 기간 종료일
        dayClasses += " bg-[#319CE5] text-white rounded-r-full";
      } else if (isSelected) { // 기간 내 날짜
        dayClasses += " bg-[#319CE5]/20 text-[#319CE5] rounded-none";
      } else if (isToday) { // 오늘 날짜
        dayClasses += " border border-[#319CE5] rounded-full";
      }
      
      // 배경 채우기 (기간 선택 시 중간 날짜의 배경)
      const isMiddle = isSelected && !isStart && !isEnd;
      const wrapperClasses = `relative flex justify-center items-center ${isMiddle ? 'bg-[#319CE5]/20 rounded-none' : ''}`;

      days.push(
        <div key={i} className={wrapperClasses}>
          <div 
            className={dayClasses} 
            onClick={() => handleDateClick(currentDate)}
          >
            {i}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap w-full text-[15px]">
        {days}
      </div>
    );
  };
  
  // 현재 달과 다음 달을 표시하기 위한 날짜 객체
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  // =================================================================
  // 🖼️ 렌더링 도우미: 헤더와 버튼 (기존 로직 유지)
  // =================================================================

 // renderHeader 함수 내부 수정
const renderHeader = () => (
    <div className="w-full flex items-center px-4 py-3 border-b border-gray-100 bg-white pt-[40px] z-50 relative"> {/* z-50으로 최상단 유지 */}
      {/* X 버튼: 배경색 제거 또는 투명으로 설정 */}
      <button 
        onClick={handleBack}
        className="text-[#757575] text-[34px] z-10 p-2 rounded-full bg-transparent hover: transition duration-300 focus:outline-none 
        hover:border-none active:outline-none active:shadow-lg"
        aria-label="여행 생성 닫기"
      >
        {/* IoMdClose 대체 */}
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-x">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      
      {/* 제목 중앙 배치 */}
      <div className="absolute inset-x-0 text-center pointer-events-none">
        <h1 className="font-bold text-[#319CE5] text-[20px]">새 여행 만들기</h1>
      </div>
    </div>
);

  // 🎨 이미지 디자인을 반영하여 수정 (사용 안 함: 인라인으로 변경)
  const renderBottomButton = (label: string, disabled: boolean = false, onClick: () => void = () => handleNext(step + 1)) => (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center p-4 bg-white shadow-top z-40">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-11/12 max-w-sm font-semibold px-6 py-3 rounded-full text-[16px] transition duration-300 shadow-xl
          ${disabled 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-gradient-to-r from-[#319CE5] to-[#65E0FF] text-white hover:opacity-90 active:opacity-80'
          }`}
      >
        {label}
      </button>
      
    </div>
  );

  // =================================================================
  // ➡️ 각 단계별 UI 렌더링 (통합 로직)
  // =================================================================
  
  const renderStepContent = () => {
    switch (step) {
      case 1:
        // 🎨 Step 1: 개요 화면
        return (
          <div className="p-4 space-y-3 pt-10">
            {/* 여행 국가 (step 2로 이동) */}
            <InputBox value={tripData.country || '여행 국가'} onClick={() => handleNext(2)} />
            {/* 여행 지역 (step 3로 이동) */}
            <InputBox value={tripData.city || '여행 지역'} onClick={() => handleNext(3)} />
            {/* 여행 날짜 (step 4로 이동) */}
            <InputBox value={tripData.dateRange.start ? '날짜 선택됨' : '여행 날짜'} onClick={() => handleNext(4)} />
            {/* 여행 동반자 (step 5로 이동) */}
            <InputBox value={Object.values(tripData.companions).reduce((a, b) => a + b, 0) > 0 ? '동반자 선택됨' : '여행 동반자'} onClick={() => handleNext(5)} />
            
            {/* 하단 버튼 */}
            <div className="fixed bottom-0 left-0 right-0 flex justify-center p-4 bg-white shadow-top z-40">
              <button
                onClick={handleCreateTrip}
                className="fixed bottom-12 bg-gradient-to-r from-[#319CE5] to-[#65E0FF] text-white font-semibold px-11 py-2.5 rounded-full shadow-lg text-[16px]
                hover:from-[#2474b0] hover:to-[#52c0d9] transition duration-300 focus:outline-none
                hover:border-none active:outline-none active:shadow-lg">
                여행 생성
              </button>
            </div>
          </div>
        );

      case 2: // 국가 선택 (확장)
      case 3: // 지역 선택 (확장)
      case 4: // 날짜 선택 (확장)
      case 5: // 동반자 선택 (확장)
        
        let expandedBlock;

        // 1. 해당 Step에 맞는 확장 블록 내용 설정
        if (step === 2) {
  expandedBlock = (
    <div className="p-3 bg-white border border-[#D4D4D4] rounded-[10px] shadow-lg mb-6 relative z-30">
      {/* 🔍 검색창 */}
      <SearchInput
        query={searchQuery}
        setQuery={setSearchQuery}
        placeholder="여행 국가 검색"
      />

      {/* 🇰🇷 국가 리스트 */}
      <div className="mt-1 max-h-40 overflow-y-auto space-y-[1px]">
        {countryData
          .filter((c) => c.name.includes(searchQuery))
          .map((country) => (
            <button
              key={country.code}
              onClick={() =>  handleNext(1, { country: country.name, flag: country.flag })
              }
              className="w-full flex items-center space-x-3 py-[px] px-3 rounded-lg bg-white hover:bg-gray-100 active:bg-gray-200 active:scale-[0.98] transition duration-150 text-left"
            >
              {/* 🌍 국기 이미지 */}
              <img
                src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                alt={country.name}
                className="w-[35px] h-[26px] object-cover rounded-[4px] border border-gray-200"
              />

              {/* ✍️ 국가 이름 */}
              <span className="font-medium text-[#4B4B4B] text-[14px]">
                {country.name}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}

        else if (step === 3) {
            expandedBlock = (
                <div className="p-3 bg-white border border-[#D4D4D4] rounded-[10px] shadow-lg mb-6 relative z-30">
                    <SearchInput query={searchQuery} setQuery={setSearchQuery} placeholder="여행 지역 검색" />
                    <div className="mt-4 space-y-1 max-h-40 overflow-y-auto">
                        {cityData.filter(c => c.name.includes(searchQuery)).map(city => (
                            <div key={city.name} className="flex items-center space-x-3 p-2 cursor-pointer hover:bg-gray-100 transition duration-150 rounded-lg"
                                onClick={() => handleNext(1, { city: city.name })}>
                                <span className="text-[14px] font-medium">{city.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        } else if (step === 4) {
            expandedBlock = (
                <div className="p-3 bg-white border border-[#D4D4D4] rounded-[10px] shadow-lg mb-6 relative z-30">
                    <h3 className="text-lg font-bold text-[#4B4B4B] mb-4">여행 날짜 선택</h3>
                    <CalendarMonth date={today} renderMonth={renderMonth} />
                    <CalendarMonth date={nextMonth} renderMonth={renderMonth} />

                    <button
                        onClick={() => handleNext(1)}
                        disabled={!tripData.dateRange.start || !tripData.dateRange.end}
                        className="w-full mt-4 bg-gradient-to-r from-[#319CE5] to-[#65E0FF] text-white font-semibold py-3 rounded-full disabled:from-gray-400 disabled:to-gray-600 transition duration-300"
                    >
                        선택 완료
                    </button>
                </div>
            );
        } else if (step === 5) {
            expandedBlock = (
                <div className="p-3 bg-white border border-[#D4D4D4] rounded-[10px] shadow-lg mb-6 relative z-30">
                    <h3 className="text-xl font-bold text-[#4B4B4B] mb-4">여행 동반자 수</h3>
                    
                    {companionData.map(comp => (
                        <CompanionSelector
                            key={comp.key}
                            label={comp.label}
                            count={tripData.companions[comp.key]}
                            onIncrease={() => handleCompanionChange(comp.key, 1)}
                            onDecrease={() => handleCompanionChange(comp.key, -1)}
                        />
                    ))}
                    
                    <button
                        onClick={() => handleNext(1)}
                        className="w-full mt-4 bg-gradient-to-r from-[#319CE5] to-[#65E0FF] text-white font-semibold py-3 rounded-full transition duration-300"
                    >
                        선택 완료
                    </button>
                </div>
            );
        }

        // 2. Step 1의 모든 블록을 순서대로 배치 (현재 Step에 맞는 블록은 확장 블록으로 대체, z-30 적용)
        return (
            <div className="p-4 space-y-3 pt-10">
                
                {/* 여행 국가 (Step 2) */}
                {step === 2 
                    ? expandedBlock 
                    : <InputBox value={tripData.country || '여행 국가'} onClick={() => handleNext(2)} className="relative z-30" />} 
                
                {/* 여행 지역 (Step 3) */}
                {step === 3 
                    ? expandedBlock 
                    : <InputBox value={tripData.city || '여행 지역'} onClick={() => handleNext(3)} className="relative z-30" />}
                
                {/* 여행 날짜 (Step 4) */}
                {step === 4 
                    ? expandedBlock 
                    : <InputBox value={tripData.dateRange.start ? '날짜 선택됨' : '여행 날짜'} onClick={() => handleNext(4)} className="relative z-30" />}
                
                {/* 여행 동반자 (Step 5) */}
                {step === 5 
                    ? expandedBlock 
                    : <InputBox value={Object.values(tripData.companions).reduce((a, b) => a + b, 0) > 0 ? '동반자 선택됨' : '여행 동반자'} onClick={() => handleNext(5)} className="relative z-30" />}
                
                {/* 키보드/하단 영역 확보 */}
                <div className="h-40"></div> 
                
                {/* 하단 버튼 영역 */}
                <div className="fixed bottom-0 left-0 right-0 flex justify-center p-4 bg-white shadow-top z-40">
                  <button onClick={handleCreateTrip} 
                  className="fixed bottom-12 bg-gradient-to-r from-[#319CE5] to-[#65E0FF] text-white font-semibold px-11 py-2.5 rounded-full shadow-lg text-[16px]
                hover:from-[#2474b0] hover:to-[#52c0d9] transition duration-300 focus:outline-none
                hover:border-none active:outline-none active:shadow-lg">
                    여행 생성
                  </button>
                </div>
            </div>
        );
        
      default: // 6단계 (로딩 모달은 별도로 렌더링)
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDFD] flex flex-col max-w-md mx-auto relative">
      {renderHeader()}
      
      {/* 🌟 외부 클릭 시 닫기 오버레이 🌟 */}
      { (step >= 2 && step <= 5) && ( 
            <div 
                className="fixed inset-0 z-20" // z-20: 배경 오버레이
                onClick={() => handleNext(1)} // 오버레이 클릭 시 Step 1로 돌아감
                aria-label="선택 화면 닫기"
            ></div>
        )}

      <div className="flex-1 overflow-y-auto pb-20 z-10"> {/* z-10: 기본 컨텐츠 */}
            {renderStepContent()}
      </div>

        {/* 여행 생성_6: 로딩 모달 */}
        {loading && <LoadingModal />}
    </div>
  );
}

// =================================================================
// 🧩 재사용 가능한 컴포넌트
// =================================================================

// 1단계 입력 박스 (💡 className prop을 받도록 수정하여 z-index 적용 가능하게 함)
const InputBox = ({ value, onClick, className }: any) => {
  const placeholder = value === '날짜 선택됨' || value === '동반자 선택됨' ? '여행 기간/동반자' : value;
  
  const baseClasses = "w-[96%] py-[12px] px-[12px] border border-[#D4D4D4] rounded-[10px] text-[14px] text-[#8C8C8C] bg-[#F8F8F8] cursor-pointer shadow-sm placeholder:text-[#808080] focus:outline-none focus:ring-0";

  return (
    <div className={`relative ${className || ''}`}>
      <input
        type="text"
        value={value === '날짜 선택됨' || value === '동반자 선택됨' ? '' : value}
        readOnly={true}
        onClick={onClick}
        className={baseClasses}
        placeholder={placeholder}
      />
      {/* 선택된 값을 플레이스홀더 위에 오버레이하여 표시 */}
      {(value === '날짜 선택됨' || value === '동반자 선택됨') && (
        <span className="absolute top-1/2 left-4 transform -translate-y-1/2 text-[14px] text-[#319CE5] font-medium pointer-events-none">
          {value}
        </span>
      )}
    </div>
  )
};

// 2, 3단계 검색 입력 필드
const SearchInput = ({ query, setQuery, placeholder }: any) => (
  <div className="relative">
    {/* 🔍 검색 아이콘 + 입력 필드 전체를 감싸는 검은 테두리 박스 */}
    <div className="flex items-center border border-[#8B8B8B] rounded-[10px] px-3 py-[6px] bg-white shadow-sm">
      {/* 돋보기 아이콘 */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
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

      {/* 입력 필드 */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full py-1 pl-3 rounded-[10px] pr-4 border-none text-[14px] rounded-[10px] focus:ring-0 focus:border-transparent focus:outline-none bg-transparent"
      />
    </div>
  </div>
);

// 4단계 캘린더 월 표시
const CalendarMonth = ({ date, renderMonth }: any) => {
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="bg-white p-3 rounded-xl shadow-lg">
      <h3 className="text-xl font-bold text-center mb-4 text-[#4B4B4B]">
        {date.getFullYear()}년 {monthNames[date.getMonth()]}
      </h3>
      {/* 요일 헤더 */}
      <div className="flex w-full text-center text-sm font-bold text-gray-500 mb-2">
        {dayNames.map((day, index) => (
          <div 
            key={day} 
            className={`w-[14.28%] ${index === 0 ? 'text-red-500' : 'text-gray-500'}`}
          >
            {day}
          </div>
        ))}
      </div>
      {/* 날짜 렌더링 */}
      {renderMonth(date)}
    </div>
  );
};

// 5단계 동반자 선택
const CompanionSelector = ({ label, count, onIncrease, onDecrease }: any) => (
  <div className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm">
    <div className="flex flex-col">
        <span className="text-lg font-medium text-[#4B4B4B]">{label}</span>
        <span className="text-sm text-gray-500">인원 수</span>
    </div>
      <div className="flex items-center space-x-3">
        <button 
          onClick={onDecrease} 
          disabled={count === 0} 
          className="text-[#319CE5] disabled:text-gray-300"
          aria-label={`${label} 인원 한 명 감소`}
        >
        {/* AiOutlineMinusCircle 대체 */}
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-2xl feather feather-minus-circle">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        </button>
        <span className="text-xl font-bold text-[#4B4B4B] w-6 text-center">{count}</span>
        <button 
          onClick={onIncrease} 
          className="text-[#319CE5]"
          aria-label={`${label} 인원 한 명 증가`}
        >
        {/* AiOutlinePlusCircle 대체 */}
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-2xl feather feather-plus-circle">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        </button>
    </div>
  </div>
);

// 6단계 로딩 모달
const LoadingModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-xl shadow-2xl text-center w-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#319CE5] mx-auto mb-4"></div>
            <h4 className="text-lg font-bold text-[#4B4B4B]">여행 생성 중</h4>
            <p className="text-sm text-gray-500 mt-2">
                여행 정보를 분석하고 있어요. 잠시만 기다려 주세요.
            </p>
        </div>
    </div>
);
