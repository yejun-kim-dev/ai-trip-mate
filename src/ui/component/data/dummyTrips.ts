import tripbox_sampleImg from "../images/tripbox_sample.jpg";
import tripimage_sampleImg from "../images/tripimage_sample.jpg";

// ✅ 1. 장소(Place) 타입 정의
export interface Place {
  id: string;
  name: string;
  time?: string;       // 운영 시간
  period?: string;     // 운영 기간 (추가됨)
  location?: string;
  memo?: string;
}

// ✅ 2. 날짜별 일정(Schedule) 타입 정의
export interface Schedule {
  [day: number]: Place[];
}

// ✅ 3. 동반자 & 여행 정보(TripState) 타입 정의
export interface Companions {
  [key: string]: number;
}

export interface TripState {
  id?: number;
  country: string;
  flag?: string;
  city: string;
  dateRange: {
    start: Date | string | null;
    end: Date | string | null;
    text?: string;
  };
  companions: Companions;
  imageUrl?: string;
  schedule?: Schedule;
}

// ✅ 4. ✈️ 부산 여행 더미 데이터
export const dummyBusanTrip: TripState = {
  id: 1,
  country: "대한민국",
  city: "부산",
  dateRange: {
    start: "2025-12-23",
    end: "2025-12-26",
    text: "2025.12.23 ~ 2025.12.26",
  },
  companions: { friends: 1 },
  imageUrl: tripbox_sampleImg,

  schedule: {
    1: [
      {
        id: "p1",
        name: "해운대 해수욕장",
        period: "2025.06.01 ~ 2025.08.31", // ✅ 여름철 개장 기간
        time: "09:00 - 18:00",
        location: "부산광역시 해운대구",
      },
      {
        id: "p2",
        name: "더베이 101 (야경 명소)",
        time: "18:00 - 22:00",
        location: "부산광역시 해운대구 동백로 52",
      },
    ],
    2: [
      {
        id: "p3",
        name: "감천문화마을",
        time: "10:00 - 17:00",
        location: "부산광역시 사하구 감내2로 203",
      },
      {
        id: "p4",
        name: "국제시장 & 깡통시장 겨울축제",
        period: "2025.12.20 ~ 2026.01.05", // ✅ 행사 기간 있음
        time: "11:00 - 21:00",
        location: "부산광역시 중구 신창동4가",
      },
    ],
    3: [
      {
        id: "p5",
        name: "광안리 해수욕장 (드론쇼)",
        time: "19:00 - 20:30",
        location: "부산광역시 수영구 광안해변로 219",
      },
      {
        id: "p6",
        name: "부산 불꽃축제",
        period: "2025.12.25", // ✅ 단일 날짜 행사
        time: "20:00 - 21:30",
        location: "광안대교 인근 해변",
      },
    ],
    4: [],
  },
};

// ✅ 5. ✈️ 제주도 여행 더미 데이터 (예시)
export const dummyJejuTrip: TripState = {
  id: 2,
  country: "대한민국",
  city: "제주도",
  dateRange: {
    start: "2024-08-10",
    end: "2024-08-15",
    text: "2024.08.10 ~ 2024.08.15",
  },
  companions: { family: 3 },
  imageUrl: tripimage_sampleImg,

  schedule: {
    1: [
      {
        id: "j1",
        name: "성산일출봉",
        time: "06:00 - 09:00",
        location: "제주시 성산읍 성산리 1",
      },
      {
        id: "j2",
        name: "우도 페리 탑승",
        period: "연중무휴", // ✅ 기간만 있음
        time: "07:30 - 18:00",
        location: "제주시 우도면 하우목동항",
      },
    ],
    2: [
      {
        id: "j3",
        name: "제주 동문시장 야시장",
        time: "18:00 - 23:00",
        location: "제주시 관덕로14길 20",
      },
      {
        id: "j4",
        name: "한라산 국립공원 (탐방 허가 기간)",
        period: "2024.04.01 ~ 2024.11.30",
        location: "제주시 1100로",
      },
    ],
  },
};

// ✅ 6. 홈 기본 여행 목록
export const defaultTrips: TripState[] = [dummyBusanTrip, dummyJejuTrip];
