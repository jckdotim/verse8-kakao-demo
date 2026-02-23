# CLAUDE.md

## Project Overview

Verse8 카카오톡 챗봇 스킬 서버. 카카오톡 채널을 통해 사용자의 게임 아이디어를 대화형으로 수집하고, Verse8 플랫폼의 게임 생성 링크를 제공하는 AI 챗봇.

## Tech Stack

- **Runtime**: Node.js (vanilla JS, no TypeScript)
- **Framework**: Express
- **AI**: Claude API (`@anthropic-ai/sdk`, model: `claude-sonnet-4-20250514`)
- **Platform**: 카카오톡 스킬 서버 (카카오 i 오픈빌더 연동)

## Project Structure

```
src/
├── app.js                        # Express 앱 설정
├── server.js                     # 서버 엔트리포인트
├── routes/skill.js               # /api/chat POST 라우트 (스킬 엔드포인트)
├── services/
│   ├── claude.js                 # Claude API 호출 및 응답 파싱
│   └── conversation.js           # 세션 관리 (히스토리, 게임 컨텍스트, 페이즈)
├── prompts/system-prompt.js      # 시스템 프롬프트 빌더
├── formatters/kakao-response.js  # Claude 응답 → 카카오 SkillResponse 변환
├── constants/kakao-limits.js     # 카카오 말풍선 글자수 제한 상수
└── utils/timeout.js              # Promise 타임아웃 유틸
```

## Key Concepts

### 대화 페이즈 (Phase)
세션별로 3단계 페이즈를 관리:
1. **exploring**: 장르/차원/테마/아트스타일 탐색
2. **refining**: 캐릭터/스토리/메카닉 세부사항 수집
3. **generating**: 영문 프롬프트 생성 및 Verse8 링크 제공

### 게임 컨텍스트 (GameContext)
세션별로 누적되는 게임 설정 정보: genre, dimension, theme, artStyle, characters, mechanics, story, title, additionalDetails

### Claude 응답 구조
Claude는 `{ response, contextUpdate, phaseTransition, generatedPrompt }` 형태의 JSON을 반환. `response`는 카카오 말풍선 포맷.

## Development Commands

```bash
npm install        # 의존성 설치
npm run dev        # 개발 서버 (--watch 모드)
npm start          # 프로덕션 서버
```

## Environment Variables

```
ANTHROPIC_API_KEY  # Claude API 키 (필수)
PORT               # 서버 포트 (기본: 3000)
```

## API Endpoint

- `POST /api/chat` — 카카오 스킬 요청 처리
- `GET /health` — 헬스체크

## Notes

- 카카오톡 스킬 타임아웃은 5초이므로 Claude 호출 타임아웃을 4.3초로 설정
- callbackUrl이 있으면 즉시 useCallback 응답 후 백그라운드에서 Claude 호출
- 세션은 인메모리 Map으로 관리, 1시간 미사용 시 자동 정리
