import xlsx from "xlsx";

export async function fetchFestivalHWP() {
  const workbook = xlsx.readFile("./data/지역축제.xlsx"); // 변환한 파일
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  const list = rows.map((row) => ({
    name: row["축제명"] || "",
    period: `${row["시작일(년)"]}.${row["시작일(월)"]}.${row["시작일(일)"]} ~ ${row["종료일(년)"]}.${row["종료일(월)"]}.${row["종료일(일)"]}`,
    location: row["장소명"] || row["지자체명"] || "",
    source: "문화체육관광부 지역축제",
  }));

  return list;
}
