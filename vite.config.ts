import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ Vercel + React Router + Gemini API 완벽 호환 설정
export default defineConfig({
  plugins: [react()],
  base: "/", // SPA 라우팅 시 필수
  define: {
    "process.env": {}, // Vercel 환경에서 process undefined 방지
  },
  build: {
    outDir: "dist", // ⚙️ 빌드 결과 폴더
    emptyOutDir: true, // ✅ dist 깨끗하게 초기화
  },
});
