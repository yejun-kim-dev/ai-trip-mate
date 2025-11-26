# 문제 해결 가이드

## ❌ "Failed to fetch" 오류 해결

### 원인
1. **포트 불일치**: Vite 프록시가 포트 1000으로 설정되어 있었음
2. **직접 URL 사용**: 프론트엔드가 직접 `localhost:8000` 호출
3. **환경 변수 불일치**: Supabase 키 이름이 일치하지 않음

### ✅ 해결 방법

#### 1. 서버 실행 확인
```bash
npm run server
```

서버가 정상적으로 시작되면 다음 메시지가 표시됩니다:
```
🚀 Server running at http://localhost:8000
📡 API 엔드포인트: http://localhost:8000/api/chat
🔑 Gemini Key: ✅ 설정됨
🗄️ Supabase URL: ✅ 설정됨
```

#### 2. 프론트엔드 실행
다른 터미널에서:
```bash
npm run dev
```

#### 3. 환경 변수 확인
`.env` 파일에 다음 변수들이 설정되어 있는지 확인:
```env
GEMINI_API_KEY=your_key_here
SUPABASE_URL=your_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_KEY=your_anon_key_here
PORT=8000
```

## 🔧 수정된 내용

### 1. Vite 프록시 설정 (`vite.config.ts`)
- 포트 1000 → 8000으로 변경
- 프론트엔드에서 `/api/chat`로 요청하면 자동으로 `http://localhost:8000/api/chat`로 프록시됨

### 2. 프론트엔드 요청 (`Chatbot.tsx`)
- 직접 URL 대신 상대 경로 `/api/chat` 사용
- 더 나은 에러 메시지 표시

### 3. 서버 에러 핸들링 (`server.js`)
- 시작 시 환경 변수 확인 로그 추가
- 전역 에러 핸들링 추가

### 4. Supabase 클라이언트 (`ai/api/memory/supabaseClient.js`)
- 환경 변수 이름 통일 (`SUPABASE_SERVICE_ROLE_KEY` 우선 사용)
- 경로 문제 수정

### 5. LangChain 구조 (`ai/chains/`)
- `searchEventInfo` 함수 추가
- 메모리 텍스트 변환 로직 개선

## 🧪 테스트 방법

1. **서버 실행 확인**
   ```bash
   npm run server
   ```
   - 포트 8000에서 실행되는지 확인
   - 환경 변수 로드 확인

2. **프론트엔드 실행**
   ```bash
   npm run dev
   ```
   - 브라우저에서 `http://localhost:5173` 접속

3. **채팅 테스트**
   - "안녕하세요" 메시지 전송
   - "서울에서 3월 1일부터 3월 3일까지 팝업 추천해줘" 전송

## 🐛 추가 문제 해결

### 서버가 시작되지 않는 경우
- 포트 8000이 이미 사용 중인지 확인: `netstat -ano | findstr :8000`
- `.env` 파일이 프로젝트 루트에 있는지 확인
- Node.js 버전 확인 (18 이상 필요)

### API 요청이 실패하는 경우
- 브라우저 개발자 도구 → Network 탭에서 요청 확인
- 서버 콘솔에서 에러 로그 확인
- CORS 오류인지 확인 (이미 `cors()` 미들웨어 적용됨)

### LLM이 응답하지 않는 경우
- `GEMINI_API_KEY`가 올바른지 확인
- 서버 콘솔에서 Gemini API 호출 로그 확인
- API 키 할당량 확인

### 추천이 나오지 않는 경우
- Supabase 연결 확인
- `popups` 테이블에 데이터가 있는지 확인
- 메시지에서 지역/날짜 파싱 로그 확인

## 📝 체크리스트

- [ ] 서버가 포트 8000에서 실행 중
- [ ] 프론트엔드가 포트 5173에서 실행 중
- [ ] `.env` 파일에 모든 환경 변수 설정됨
- [ ] 브라우저 콘솔에 CORS 오류 없음
- [ ] 서버 콘솔에 에러 없음
- [ ] 네트워크 탭에서 `/api/chat` 요청이 200 응답

