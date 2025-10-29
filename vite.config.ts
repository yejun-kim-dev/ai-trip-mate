import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/", // ✅ 이 줄이 핵심! (Vercel에서 JS 경로 인식용)
  build: {
    outDir: "dist", // ✅ 빌드 결과를 dist 폴더로 지정
  },
});
