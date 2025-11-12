// memoryAnalyzer.js
export function analyzeUserMemory(memory) {
  const summary = {
    topCategories: [],
    topBrands: [],
    topCities: [],
  };

  if (!memory || !Array.isArray(memory.travelHistory)) return summary;

  const categoryCount = {};
  const brandCount = {};
  const cityCount = {};

  for (const trip of memory.travelHistory) {
    for (const c of trip.categories || []) {
      categoryCount[c] = (categoryCount[c] || 0) + (trip.count || 1);
    }
    for (const b of trip.brandOrKeyword || []) {
      brandCount[b] = (brandCount[b] || 0) + (trip.count || 1);
    }
    if (trip.city) {
      cityCount[trip.city] = (cityCount[trip.city] || 0) + (trip.count || 1);
    }
  }

  // 상위 3개씩 추출
  const sortTop = (obj) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);

  summary.topCategories = sortTop(categoryCount);
  summary.topBrands = sortTop(brandCount);
  summary.topCities = sortTop(cityCount);

  return summary;
}
