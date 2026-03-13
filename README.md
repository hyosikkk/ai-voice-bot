# AI 더빙 서비스

오디오 또는 비디오 파일을 업로드하면 AI가 자동으로 원하는 언어로 더빙해주는 웹 서비스입니다.

## 주요 기능

- **파일 업로드**: 오디오(MP3, WAV, OGG 등) 및 비디오(MP4, WebM 등) 파일 업로드 (최대 100MB)
- **음성 인식(STT)**: ElevenLabs Scribe 모델로 업로드된 파일의 음성을 자동으로 텍스트로 변환
- **AI 번역**: Claude API(claude-sonnet-4-6)로 인식된 텍스트를 목표 언어로 자연스럽게 번역
- **음성 합성(TTS)**: ElevenLabs 다국어 모델(eleven_multilingual_v2)로 번역된 텍스트를 음성으로 합성
- **재생 및 다운로드**: 더빙 결과물을 바로 재생하거나 MP3로 다운로드
- **화이트리스트 기반 접근 제어**: 승인된 Google 계정만 서비스 이용 가능

## 지원 언어

| 코드 | 언어 |
|------|------|
| `ko` | 한국어 |
| `en` | English |
| `ja` | 日本語 |
| `es` | Español |

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| 인증 | NextAuth.js v4 + Google OAuth |
| 데이터베이스 | Turso (libSQL) |
| 파일 저장소 | Vercel Blob |
| 음성 인식 | ElevenLabs Speech-to-Text (Scribe v1) |
| 번역 | Claude API (claude-sonnet-4-6) |
| 음성 합성 | ElevenLabs TTS (Multilingual v2) |
| 배포 | Vercel |

## 로컬 개발 환경 설정

### 1. 저장소 클론

```bash
git clone <repository-url>
cd ai-voice-bot
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.local.example` 파일을 복사하여 `.env.local`을 생성하고 각 값을 입력합니다.

```bash
cp .env.local.example .env.local
```

| 변수명 | 설명 | 발급처 |
|--------|------|--------|
| `ELEVENLABS_API_KEY` | ElevenLabs API 키 | [elevenlabs.io](https://elevenlabs.io) |
| `ELEVENLABS_VOICE_ID` | (선택) 사용할 음성 ID, 기본값: Rachel | ElevenLabs 대시보드 |
| `ANTHROPIC_API_KEY` | Claude API 키 | [console.anthropic.com](https://console.anthropic.com) |
| `TURSO_DATABASE_URL` | Turso DB URL (`libsql://...`) | [turso.tech](https://turso.tech) |
| `TURSO_AUTH_TOKEN` | Turso 인증 토큰 | Turso 대시보드 |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | [Google Cloud Console](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 | Google Cloud Console |
| `NEXTAUTH_SECRET` | NextAuth 암호화 키 (`openssl rand -base64 32`로 생성) | 직접 생성 |
| `NEXTAUTH_URL` | 서비스 URL (로컬: `http://localhost:3000`) | - |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 토큰 | Vercel 대시보드 Storage 탭 |

### 4. Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com)에서 새 프로젝트 생성
2. OAuth 2.0 클라이언트 ID 생성
3. 승인된 리디렉션 URI 추가:
   - 로컬: `http://localhost:3000/api/auth/callback/google`
   - 프로덕션: `https://your-domain.vercel.app/api/auth/callback/google`

### 5. Turso DB 설정

```bash
# Turso CLI 설치
npm install -g @turso/cli

# 로그인
turso auth login

# 데이터베이스 생성
turso db create ai-dubbing

# URL과 토큰 확인
turso db show ai-dubbing
turso db tokens create ai-dubbing
```

> **참고**: 화이트리스트 테이블과 초기 이메일(`kts123@estsoft.com`)은 첫 로그인 시도 시 자동으로 생성됩니다.

### 6. Vercel Blob 설정 (로컬 개발)

```bash
# Vercel CLI 설치
npm install -g vercel

# Vercel 로그인 및 프로젝트 연결
vercel link

# 환경 변수 가져오기 (BLOB_READ_WRITE_TOKEN 포함)
vercel env pull .env.local
```

### 7. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

## Vercel 배포

### 1. GitHub 저장소 연결

1. [Vercel 대시보드](https://vercel.com)에서 "New Project" 클릭
2. GitHub 저장소 import
3. Framework Preset: **Next.js** 선택

### 2. 환경 변수 설정

Vercel 프로젝트 설정 → Environment Variables에서 위 표의 모든 환경 변수를 입력합니다.
`NEXTAUTH_URL`은 실제 배포 URL로 설정합니다.

### 3. Vercel Blob 스토어 생성

1. Vercel 프로젝트 → Storage 탭 → "Create Database" → "Blob" 선택
2. 생성 후 프로젝트에 연결하면 `BLOB_READ_WRITE_TOKEN`이 자동으로 환경 변수에 추가됨

### 4. 배포

GitHub에 push하면 Vercel이 자동으로 빌드 및 배포합니다.

### 5. Google OAuth 리디렉션 URI 업데이트

Google Cloud Console에서 배포된 도메인의 리디렉션 URI를 추가합니다:
```
https://your-app.vercel.app/api/auth/callback/google
```

## 배포된 서비스 URL

> 배포 후 이 섹션에 URL을 기재합니다.
> 예: `https://ai-dubbing.vercel.app`

## 파일 크기 제한 안내

- **Vercel 요청 크기 제한**: Vercel 서버리스 함수는 4.5MB의 요청 크기 제한이 있습니다.
- **해결 방법**: 이 서비스는 `@vercel/blob`을 사용한 **클라이언트 사이드 직접 업로드** 방식으로 이 제한을 우회합니다. 파일이 Vercel 서버를 거치지 않고 Blob 스토리지에 직접 업로드되므로 최대 100MB 파일을 처리할 수 있습니다.

## 코딩 에이전트 활용 방법 및 주요 인사이트

### 활용 방법

이 프로젝트는 **Claude Code (claude-sonnet-4-6)** AI 코딩 에이전트를 활용하여 개발되었습니다.

#### 에이전트에게 요청한 주요 작업

1. **프로젝트 구조 설계**: Next.js App Router 기반의 전체 프로젝트 아키텍처 설계
2. **더빙 파이프라인 구현**: ElevenLabs STT → Claude 번역 → ElevenLabs TTS 자동화 흐름 구현
3. **인증 시스템 구현**: NextAuth.js + Google OAuth + Turso DB 화이트리스트 연동
4. **대용량 파일 처리**: Vercel 4.5MB 제한 우회를 위한 클라이언트 사이드 업로드 설계
5. **UI 컴포넌트 구현**: 파일 업로드, 진행 상태 표시, 오디오 플레이어 컴포넌트

#### 주요 인사이트

1. **서버리스 환경의 파일 크기 제한 처리**: Vercel의 4.5MB 요청 크기 제한을 `@vercel/blob`의 클라이언트 사이드 업로드로 우회하는 패턴이 핵심이었습니다. 대용량 파일을 서버를 거치지 않고 스토리지에 직접 업로드한 후 URL만 서버에 전달하는 방식입니다.

2. **AI API 조합의 시너지**: ElevenLabs의 다국어 STT 모델(Scribe v1)과 Claude의 고품질 번역, 그리고 ElevenLabs의 다국어 TTS(Multilingual v2) 모델을 조합하면 별도의 언어 설정 없이도 자동으로 언어를 감지하고 자연스러운 더빙을 생성할 수 있습니다.

3. **서버리스 함수 실행 시간**: 더빙 파이프라인(STT + 번역 + TTS)은 파일 길이에 따라 수십 초가 소요될 수 있어 `maxDuration` 설정이 중요합니다.

4. **화이트리스트 기반 접근 제어**: NextAuth의 `signIn` 콜백에서 DB 조회로 접근을 제어하는 패턴은 간결하면서도 효과적입니다. 첫 실행 시 자동으로 테이블을 생성하는 `ensureDb()` 함수가 서버리스 환경에서 DB 마이그레이션의 번거로움을 줄여줍니다.

5. **AI 코딩 에이전트의 장점**: 반복적인 보일러플레이트 코드 작성, 여러 외부 API 통합, 타입 정의 등에서 에이전트가 특히 유용했습니다. 전체 프로젝트를 한 번에 설계하고 일관된 패턴으로 구현할 수 있었습니다.
