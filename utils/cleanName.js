// utils/cleanName.js

export function cleanName(raw) {
  if (!raw) return null;

  let name = raw
    .replace(/\[.*?\]/g, "") // [브랜드] 제거
    .replace(/\(.*?\)/g, "") // ( ) 제거
    .replace(/#[^\s]+/g, "") // #해시태그 제거
    .replace(/<[^>]+>/g, "") // HTML 제거
    .replace(/[\|\-_:·~]+/g, " ") // 기호 제거
    .replace(/\s+/g, " ") // 여러 공백 → 하나
    .trim();

  // 핵심 패턴 (이 순서가 중요)
  const patterns = [
    /([가-힣A-Za-z0-9 ]+?)\s*팝업스토어/,
    /([가-힣A-Za-z0-9 ]+?)\s*팝업/,
    /([가-힣A-Za-z0-9 ]+?)\s*전시/,
    /([가-힣A-Za-z0-9 ]+?)\s*페스티벌/,
    /([가-힣A-Za-z0-9 ]+?)\s*쇼룸/,
  ];

  for (const p of patterns) {
    const m = name.match(p);
    if (m) return m[0].trim();
  }

  // 위 패턴에 안 걸릴 경우 → 첫 문장만
  return name.split(/[.!?]/)[0].trim();
}
