export function strToDate(str) {
  return new Date(str + "T00:00:00");
}

export function dateToStr(date) {
  return date.toISOString().slice(0, 10);
}
