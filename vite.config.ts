import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ Vercel + React Router + Gemini 완벽 호환 설정
export default defineConfig({
  plugins: [react()],
  base: "/",
  define: {
    "process.env": {}, // Vercel 환경에서 process undefined 방지
  },
  build: {
    outDir: "dist",
  },
});
