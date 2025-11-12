import * as XLSX from "xlsx/xlsx.mjs";
import * as fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Node ESM 환경에서 readFile 가능하게 하기
XLSX.set_fs(fs);

export function parseFestivalExcel() {
  // 📍 이 파일의 실제 위치 기준 절대 경로 계산
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // ✅ 엑셀 파일 (동일 폴더)
  const filePath = path.join(__dirname, "festivals.xlsx");

  console.log("📄 엑셀 경로:", filePath);

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet);

  return json.map((row) => ({
    category: "지역축제",
    name: row["축제명"] || null,
    location: row["장소명"] || null,
    period: `${row["시작일"] ?? ""} ~ ${row["종료일"] ?? ""}`,
    hours: null,
    source: "2025 지역축제 엑셀",
    url: `festival://${encodeURIComponent(row["축제명"] ?? "")}`,
  }));
}
