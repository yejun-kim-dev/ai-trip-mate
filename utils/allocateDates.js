import { strToDate, dateToStr } from "./dateUtils.js";

export function getPossibleDates(item, tripStart, tripEnd) {
  const s = strToDate(item.period_start);
  const e = strToDate(item.period_end);

  const ts = strToDate(tripStart);
  const te = strToDate(tripEnd);

  const result = [];
  let cur = new Date(ts);

  while (cur <= te) {
    if (cur >= s && cur <= e) result.push(dateToStr(cur));
    cur.setDate(cur.getDate() + 1);
  }

  return result;
}

// 날짜 자동 배정
export function allocateDates(items, tripStart, tripEnd) {
  const assigned = {};

  let cur = strToDate(tripStart);
  while (cur <= strToDate(tripEnd)) {
    assigned[dateToStr(cur)] = [];
    cur.setDate(cur.getDate() + 1);
  }

  const flexible = [];

  for (let item of items) {
    const possible = getPossibleDates(item, tripStart, tripEnd);

    if (possible.length === 1) {
      assigned[possible[0]].push(item);
    } else {
      flexible.push({ item, possible });
    }
  }

  for (let f of flexible) {
    let best = f.possible[0];
    for (let d of f.possible) {
      if (assigned[d].length < assigned[best].length) best = d;
    }
    assigned[best].push(f.item);
  }

  return assigned;
}
