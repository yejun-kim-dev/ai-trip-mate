import { getDistance } from "./distance.js";

export function optimizeDailyRoute(list) {
  if (list.length <= 1) return list;

  const visited = [];
  const remain = [...list];

  let cur = remain.shift();
  visited.push(cur);

  while (remain.length > 0) {
    let next = remain[0];
    let minDist = getDistance(cur, next);

    for (let r of remain) {
      const d = getDistance(cur, r);
      if (d < minDist) {
        next = r;
        minDist = d;
      }
    }

    visited.push(next);
    remain.splice(remain.indexOf(next), 1);
    cur = next;
  }

  return visited;
}
