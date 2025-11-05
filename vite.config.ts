import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ Vite + React Router + Express (포트 1000 백엔드) 연동 설정
export default defineConfig({
  plugins: [react()],
  base: "/", // SPA 라우팅 시 필수
  define: {
    "process.env": {}, // Vercel 환경에서 process undefined 방지
  },
  server: {
    port: 5173, // 프론트엔드 실행 포트
    proxy: {
      "/api": {
        target: "http://localhost:1000", // ✅ 백엔드 서버 주소
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist", // ⚙️ 빌드 결과 폴더
    emptyOutDir: true, // ✅ dist 초기화
  },
});
