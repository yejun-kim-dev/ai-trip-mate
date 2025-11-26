export function extractKeyword(text) {
  const match = text.match(/캐릭터|전시|굿즈|애니|패션|포토존|팝업/g);
  return match ? match[0] : "추천요청";
}
