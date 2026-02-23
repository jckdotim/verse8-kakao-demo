# Verse8 카카오톡 챗봇 데모

카카오톡 채널에서 대화를 통해 게임 아이디어를 구체화하고, [Verse8](https://verse8.io) 플랫폼으로 AI 게임을 자동 생성하는 챗봇 스킬 서버입니다.

## 동작 방식

1. 사용자가 카카오톡 채널에서 메시지를 보냄
2. 챗봇이 장르, 테마, 아트스타일 등을 대화형으로 질문
3. 게임 컨셉이 완성되면 영문 프롬프트를 생성
4. Verse8 게임 생성 링크를 카카오 말풍선으로 전달

### 대화 흐름

```
[Exploring] 장르/차원/테마/아트스타일 선택
    ↓
[Refining] 캐릭터/스토리/메카닉 세부사항
    ↓
[Generating] 영문 프롬프트 생성 → Verse8 링크 제공
```

## 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수

```bash
cp .env.example .env
```

`.env` 파일에 Anthropic API 키를 설정:

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
```

### 3. 실행

```bash
# 개발 모드 (파일 변경 시 자동 재시작)
npm run dev

# 프로덕션
npm start
```

## 카카오 i 오픈빌더 연동

1. [카카오 i 오픈빌더](https://chatbot.kakao.com)에서 챗봇 생성
2. 스킬 서버 URL 등록: `https://<your-domain>/api/chat`
3. 스킬 블록에 연결

### 콜백 지원

카카오톡 스킬 타임아웃(5초) 내에 응답하지 못하는 경우를 대비하여 `callbackUrl` 기반 비동기 응답을 지원합니다.

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | 카카오 스킬 요청 처리 |
| GET | `/health` | 헬스체크 |

## 기술 스택

- **Node.js** + **Express**
- **Claude API** (claude-sonnet-4-20250514)
- 카카오톡 스킬 서버 프로토콜 v2

## License

MIT
