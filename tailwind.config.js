/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563EB", // 기본 파랑 (버튼, 강조색)
          light: "#60A5FA", // 하늘색 (hover, 배경 등)
          dark: "#1E40AF", // 진한 파랑 (헤더, 네비게이션)
        },
        secondary: {
          DEFAULT: "#F59E0B", // 주황 포인트 (강조)
          light: "#FBBF24",
        },
        background: "#F9FAFB", // 밝은 배경색
        text: "#1F2937", // 기본 텍스트색 (짙은 회색)
      },
      fontFamily: {
        sans: ["'Noto Sans KR'", "system-ui", "sans-serif"], // 한국어 친화 폰트
      },
      boxShadow: {
        soft: "0 4px 10px rgba(0,0,0,0.1)", // 부드러운 그림자
      },
    },
  },
  plugins: [],
};
