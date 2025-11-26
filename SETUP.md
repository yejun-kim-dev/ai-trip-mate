# AI Trip Mate - 백엔드 연결 가이드

## 📋 개요
RAG LangChain 기반 채팅 기능을 프론트엔드와 연결하기 위한 설정 가이드입니다.

## 🔧 필요한 환경 변수

프로젝트 루트에 `.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase 설정
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_KEY=your_supabase_anon_key  # retrievalChain.js에서 사용

# 서버 포트 (선택사항, 기본값: 8000)
PORT=8000
```

## 🚀 서버 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 위의 환경 변수들을 설정하세요.

### 3. 서버 실행
```bash
npm run server
```

서버가 `http://localhost:8000`에서 실행됩니다.

## 📡 API 엔드포인트

### 채팅 API
- **URL**: `POST http://localhost:8000/api/chat`
- **요청 본문**:
  ```json
  {
    "userId": "test-user",
    "message": "서울에서 3월 1일부터 3월 3일까지 팝업 추천해줘",
    "tripData": {
      "city": "서울",
      "dateRange": {
        "start": "2024-03-01",
        "end": "2024-03-03"
      }
    }
  }
  ```
- **응답 형식**:
  ```json
  {
    "text": "AI 응답 텍스트",
    "recommendations": [
      {
        "title": "팝업 이름",
        "period": "2024-03-01 ~ 2024-03-03",
        "location": "서울 강남구",
        "type": "팝업"
      }
    ],
    "memorySummary": {},
    "extractedConcepts": []
  }
  ```

## 🔍 주요 기능

1. **RAG LangChain 통합**: `ai/chains/conversationChain.js`를 통해 RAG 기반 대화 생성
2. **추천 기능**: tripData 또는 메시지에서 지역/날짜를 추출하여 팝업 추천
3. **메모리 관리**: 사용자 대화 기록 및 선호도 저장
4. **자동 업데이트**: 팝업 데이터 자동 수집 및 DB 업데이트

## 📁 주요 파일 구조

```
ai/
├── api/
│   ├── chat.js          # 채팅 API 엔드포인트 (RAG LangChain 통합)
│   └── index.js         # API 라우터
├── chains/
│   ├── conversationChain.js  # RAG LangChain 대화 체인
│   ├── llmChain.js            # Gemini LLM 설정
│   └── retrievalChain.js     # RAG 검색 체인
└── searchPopups.js      # 팝업 검색 로직

server.js                # 메인 서버 파일 (포트 3001)
```

## ⚠️ 주의사항

1. **Supabase 키**: `SUPABASE_SERVICE_ROLE_KEY`와 `SUPABASE_KEY`는 다른 키입니다.
   - `SUPABASE_SERVICE_ROLE_KEY`: 서버 사이드 작업용 (server.js)
   - `SUPABASE_KEY`: 클라이언트 사이드 작업용 (retrievalChain.js)

2. **포트 충돌**: 다른 서비스가 8000 포트를 사용 중이면 `.env`에서 `PORT`를 변경하세요.

3. **프론트엔드 연결**: 프론트엔드의 `Chatbot.tsx`에서 `http://localhost:8000/api/chat`로 요청을 보냅니다.

## 🐛 문제 해결

### 서버가 시작되지 않는 경우
- `.env` 파일이 올바른 위치에 있는지 확인
- 필요한 환경 변수가 모두 설정되었는지 확인
- 포트가 이미 사용 중인지 확인 (`netstat -ano | findstr :8000`)

### API 요청 실패
- CORS 설정 확인 (이미 `cors()` 미들웨어 적용됨)
- 서버 로그에서 에러 메시지 확인
- 환경 변수 (특히 GEMINI_API_KEY) 확인

### 추천이 나오지 않는 경우
- Supabase 연결 확인
- `popups` 테이블에 데이터가 있는지 확인
- 메시지에서 지역/날짜가 올바르게 파싱되는지 확인

