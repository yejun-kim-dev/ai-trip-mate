export function extractKeyword(text) {
  const match = text.match(/캐릭터|전시|굿즈|애니|패션|포토존|팝업|팝업스토어|페스티벌|공연|콘서트|행사|축제|/g);
  return match ? match[0] : "추천요청";
}
