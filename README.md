# AI 더빙 서비스

음성/영상 파일을 업로드하면 AI가 자동으로 다른 언어로 더빙해주는 웹 서비스입니다.

**🚀 Demo**: https://ai-voice-bot-rose.vercel.app

---

## 서비스 소개 및 주요 기능

- **자동 더빙 파이프라인**: 음성 인식(STT) → 번역 → 음성 합성(TTS) 3단계 자동 처리
- **다국어 지원**: 한국어, 영어, 일본어, 스페인어 간 상호 더빙
- **다양한 파일 형식**: MP3, WAV, MP4, WebM 등 오디오/비디오 파일 지원 (최대 100MB)
- **비디오 더빙 비교**: 비디오 업로드 시 원본 영상과 더빙 영상을 나란히 동시 재생하여 비교
- **더빙 영상 다운로드**: ffmpeg.wasm을 활용해 브라우저에서 원본 영상 + 더빙 음성을 합쳐 MP4로 다운로드
- **자동 싱크 조정**: 더빙 음성의 재생 속도(playbackRate)를 원본 영상 길이에 맞게 자동 계산·조정
- **Google 로그인**: Google OAuth 기반 인증, 화이트리스트로 접근 제어
- **드래그 & 드롭**: 파일 드래그 업로드 지원
- **단계별 진행 표시**: 업로드 → STT → 번역 → TTS 각 처리 단계 실시간 애니메이션

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS |
| 인증 | NextAuth.js v4 + Google OAuth |
| 데이터베이스 | Turso (libSQL) - 화이트리스트 관리 |
| 파일 스토리지 | Vercel Blob |
| 음성 인식(STT) | ElevenLabs Scribe v1 |
| 번역 | Google Cloud Translation API v2 |
| 음성 합성(TTS) | ElevenLabs Multilingual v2 |
| 영상 처리 | ffmpeg.wasm (브라우저 사이드) |
| 배포 | Vercel |

---

## 서비스 동작 흐름

```
파일 업로드 (오디오/비디오)
        ↓
ElevenLabs Scribe v1 — 음성 추출 (STT)
        ↓
Google Cloud Translation API — 번역
        ↓
ElevenLabs Multilingual v2 — 더빙 생성 (TTS)
        ↓
결과물 출력
  ├── 오디오: MP3 재생 및 다운로드
  └── 비디오: 원본/더빙 영상 나란히 비교 재생 + MP4 다운로드
```

---

## 로컬 실행 방법

### 1. 저장소 클론 및 의존성 설치

```bash
git clone https://github.com/hyosikkk/ai-voice-bot.git
cd ai-voice-bot
npm install
```

### 2. 환경변수 설정

`.env.local` 파일을 생성하고 아래 항목을 채웁니다:

```env
# ElevenLabs (https://elevenlabs.io)
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=        # My Voices에서 본인 Voice ID 사용 (무료 플랜은 라이브러리 음성 불가)

# Google Translate (https://console.cloud.google.com)
GOOGLE_TRANSLATE_API_KEY=   # Cloud Translation API 활성화 후 발급, 월 500,000자 무료

# Turso DB (https://turso.tech)
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Google OAuth (https://console.cloud.google.com)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# NextAuth
NEXTAUTH_SECRET=            # openssl rand -base64 32 으로 생성
NEXTAUTH_URL=http://localhost:3000

# Vercel Blob (https://vercel.com/dashboard → Storage)
BLOB_READ_WRITE_TOKEN=
```

### 3. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속

> 화이트리스트에 등록된 Google 계정으로만 로그인 가능합니다.
> `lib/db.ts`의 `INITIAL_WHITELIST` 배열에 허용할 이메일을 추가하세요.

---

## 배포된 서비스 URL

**https://ai-voice-bot-rose.vercel.app**

> Google 계정으로 로그인 후 화이트리스트에 등록된 사용자만 이용 가능합니다.

---

## 향후 개선 사항

현재 버전에서 추가 개발이 필요한 기능 목록입니다.

| 기능 | 설명 |
|------|------|
| **입 모양 싱크 (립싱크)** | 더빙 음성에 맞게 영상 속 화자의 입 모양을 AI로 재생성 (Wav2Lip, HeyGen 등 활용 필요) |
| **배경음악/화자 음성 분리** | 배경음악이 포함된 영상에서 화자 음성만 분리 후 더빙, 배경음악은 원본 유지 (음원 분리 AI 활용) |
| **다중 화자 구분 더빙** | 여러 명이 대화하는 영상에서 화자별로 음성을 구분하고 각각 다른 목소리로 더빙 |
| **화자 음색 유지** | 원본 화자의 목소리 특징(톤, 감정)을 더빙 음성에도 반영하는 Voice Cloning 적용 |
| **자막 동기화** | STT 결과와 번역 텍스트를 타임스탬프 기반 자막으로 영상에 합성 |
| **더빙 속도 세밀 조정** | 발화 구간별로 개별 싱크 조정 (현재는 전체 길이 비율로만 조정) |
| **지원 언어 확장** | 프랑스어, 독일어, 중국어, 아랍어 등 추가 언어 지원 |

---

## 코딩 에이전트(Claude Code) 활용 방법 및 노하우

이 프로젝트는 **Claude Code** (Anthropic의 AI 코딩 에이전트)를 활용하여 개발되었습니다.

### 활용한 작업

- **프로젝트 전체 구조 설계**: 서비스 요구사항을 설명하고 Next.js App Router 기반 파일 구조와 더빙 파이프라인 아키텍처를 한 번에 설계
- **외부 API 연동**: ElevenLabs STT/TTS, Google Translate, NextAuth, Turso DB 등 여러 API를 일관된 패턴으로 통합
- **UI 개발**: 다크 글래스모피즘 디자인, 사운드웨이브 애니메이션, 좌우 비디오 비교 플레이어 구현
- **영상 처리**: ffmpeg.wasm을 활용한 브라우저 사이드 비디오 + 오디오 합성
- **싱크 조정 로직**: 더빙 음성 playbackRate 자동 계산 및 조정
- **오류 디버깅**: 브라우저 에러 메시지를 그대로 붙여넣으면 원인 분석 및 수정 코드 즉시 제시
- **배포 설정**: Vercel 배포, GitHub 자동 배포 연동, 환경변수 구성 가이드

### 노하우

1. **에러 메시지를 그대로 붙여넣기**: 긴 설명보다 실제 에러 로그를 그대로 전달하는 것이 가장 빠른 해결책을 얻는 방법

2. **요구사항을 구체적으로**: `"파일 업로드 만들어줘"` 보다 `"MP4 파일을 FormData로 받아서 처리하는 /api/dub API 라우트 만들어줘"` 처럼 구체적으로 요청할수록 정확한 결과를 얻음

3. **한 번에 하나씩**: 여러 기능을 동시에 요청하면 충돌이 생길 수 있으므로 기능 단위로 나눠서 순차적으로 요청

4. **코드 리뷰 습관**: AI가 생성한 코드도 반드시 읽고 이해한 후 적용. 특히 인증, 보안 관련 코드는 직접 확인 필수

5. **민감정보 주의**: `.env.local` 같은 파일은 대화창에 직접 노출되지 않도록 주의. 노출된 경우 즉시 키 재발급
