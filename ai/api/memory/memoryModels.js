export class UserMemory {
  constructor(userId) {
    this.userId = userId;
    this.lastUpdated = new Date().toISOString();
    this.travelHistory = []; // [{country, city, duration, companions}]
    this.preferences = [];   // ["전시", "자연", "카페"]
    this.intentHistory = []; // ["콘텐츠추천", "정보요청"]
    this.savedContents = []; // 사용자가 저장한 여행 콘텐츠
  }
}
