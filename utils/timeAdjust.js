export function adjustByTime(list) {
  return list.sort((a, b) => {
    const ao = a.open_time || "00:00";
    const bo = b.open_time || "00:00";
    return ao.localeCompare(bo);
  });
}
