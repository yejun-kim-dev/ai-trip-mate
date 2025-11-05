export function formatPopupResponse(list, region) {
  if (!list || list.length === 0) {
    return `😢 ${region}에서 해당 기간에 운영 중인 팝업을 찾지 못했어요.`;
  }

  return [
    `🎪 **${region} 팝업 추천 리스트!**`,
    ...list.map((p) => `\n✨ **${p.title}**\n📅 ${p.date}\n🔗 ${p.link}`),
  ].join("\n");
}
