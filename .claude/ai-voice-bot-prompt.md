# AI 더빙 서비스 — Claude Code 프롬프트 기록

Claude Code(AI 코딩 에이전트)에게 어떤 요구를 했고, 어떤 결과가 나왔는지 정리한 기록입니다.

---

## 1. UI 전면 개편

**요청**
> "UI를 개발자들에게 인상적으로 보이게 개선해줘. 파비콘, 애니메이션 배경, 파이프라인 시각화, 기술 스택 배지, GitHub 링크, 진행 상태 표시 추가. 텍스트는 한국어로."

**결과**
- `app/icon.svg` 생성 — 보라→청록 그라디언트 마이크 아이콘 파비콘
- `app/globals.css` 전면 재작성 — 다크 글래스모피즘, 사운드웨이브 바 애니메이션, 파이프라인 흐름 애니메이션, 네온 글로우 등 커스텀 CSS
- `app/layout.tsx` — Inter 폰트, 네뷸라 스타일 애니메이션 배경 블러, 글래스 헤더, GitHub 링크 버튼
- `app/page.tsx` — 사운드 이퀄라이저 히어로, 5단계 파이프라인 카드(흐름 애니메이션), 기술 스택 배지(ElevenLabs/Claude/Next.js/Vercel/Turso/TypeScript)
- `components/DubbingForm.tsx` — 드래그&드롭, 단계별 네온 글로우 진행 인디케이터, 그라디언트 버튼
- `components/AuthStatus.tsx`, `AudioPlayer.tsx`, `app/signin/page.tsx` — 다크 테마 통일

---

## 2. Git 커밋 & Vercel 배포

**요청**
> "이거 반영하게 깃 작업해"

**결과**
- 변경된 9개 파일 스테이징 후 커밋 (`feat: UI 전면 개편`)
- `git push origin master` 완료

**요청**
> "vercel에서도 되는거야?"
> "redeploy 해야되냐"

**결과**
- Vercel 자동 배포가 `ai-voice-bot-rose.vercel.app`에 반영 안 된 문제 확인
- `npx vercel alias` 명령으로 최신 배포를 프로덕션 도메인에 수동 연결
- 이후 push마다 `vercel alias` 재실행으로 반영

---

## 3. UI 텍스트 및 요소 수정

**요청**
> "오디오 또는 비디오 파일을 업로드하면 ElevenLabs와 Claude AI가 — 첫째 줄, 자동으로 원하는 언어로 더빙합니다 — 그 밑에 오게 수정하고, 기술 스택 배지 다 지워줘"

**결과**
- `app/page.tsx` — 문구 줄바꿈(`<br />`) 처리
- 기술 스택 배지 섹션 전체 제거
- `app/layout.tsx` — 헤더에서 GitHub 링크 버튼 제거

---

## 4. 비디오 더빙 결과 출력 기능

**요청**
> "비디오를 올리면 더빙된 음성으로 그 비디오가 화면에 나오게 출력하고 싶어"

**결과**
- `components/DubbingForm.tsx` — 비디오 파일 선택 시 `URL.createObjectURL()`로 원본 비디오 URL 생성, `AudioPlayer`에 전달
- `components/AudioPlayer.tsx` — 비디오 파일인 경우: 원본 영상(음소거) + 더빙 음성을 동기화해 재생하는 커스텀 플레이어 구현 (재생/정지 버튼, 시크바, 타임스탬프)
- 오디오 파일은 기존 오디오 플레이어 유지

---

## 5. 원본/더빙 영상 좌우 비교 + MP4 다운로드

**요청**
> "원본 영상 있고 그 옆에 더빙 영상 나오게 할 수 없나. 더빙된 파일 다운로드 할 때 비디오로 나오게 수정해줘. 원본 영상이랑 더빙된 영상이랑 구분지어주고"

**결과**
- `@ffmpeg/ffmpeg`, `@ffmpeg/util` 패키지 설치
- `components/AudioPlayer.tsx` 전면 재작성:
  - `VideoPanel` 컴포넌트 — 커스텀 컨트롤(재생/정지, 시크바, 타임스탬프), hover 오버레이
  - 좌측: 원본 영상 (원본 음성 재생)
  - 우측: 동일 영상 (음소거) + 더빙 음성 동기화 재생
  - `MergeDownloadButton` 컴포넌트 — 클릭 시 ffmpeg.wasm 로드 → 영상+음성 합성 → MP4 다운로드
  - 음성만 다운로드(MP3) 버튼 별도 제공

---

## 6. 더빙 음성 싱크 자동 조정

**요청**
> "더빙된 음성이 원래 영상의 음성보다 빨라서 싱크가 안맞아. 속도가 자동으로 조절 안되나?"

**결과**
- `components/AudioPlayer.tsx` — `VideoPanel`의 더빙 패널에 싱크 자동 조정 로직 추가
- 비디오와 오디오 둘 다 `loadedmetadata` 이벤트 수신 후 비율 계산
- `audio.playbackRate = audio.duration / video.duration` 자동 적용 (범위: 0.5x ~ 4.0x)

---

## 7. ElevenLabs Dubbing API 검토 (미적용)

**요청**
> "입모양 싱크 맞추고 싶어" → "일레븐렙스로 하자" → "유료일 것 같아서 사용 될려나?"

**결과**
- ElevenLabs Dubbing API는 무료 플랜 미지원(Starter $5/월 이상) 확인
- 현재 playbackRate 자동 조정으로 유지 결정
- 향후 개선 사항으로 README에 기록

---

## 8. 홍보 콘텐츠 작성

**요청**
> "과제 2 홍보를 위해 각 채널별 글 작성해줘"

**결과**
아래 5개 채널 바로 복붙 가능한 홍보 글 작성:
- **X (Twitter)** — 짧은 스레드 형식, 해시태그 포함
- **GeekNews** — 제목 + 서비스/기술/후기 본문
- **Velog** — 마크다운 형식 상세 개발 후기 글
- **Reddit** (r/nextjs, r/webdev) — 영어로 기술 중심 포스팅
- **카카오톡 오픈채팅** — 짧은 소개 + GitHub 링크

---

## 9. README 업데이트

**요청**
> "지금까지 작업한 거 모두 README.md에 적어줘. 비디오 비교, 싱크 조정, 향후 개선 사항(입모양 싱크, 배경음악 분리, 다중 화자 구분 등)도 추가해줘"

**결과**
- 서비스 동작 흐름 다이어그램 추가
- 비디오 비교 플레이어, ffmpeg.wasm 다운로드, 자동 싱크 조정 항목 추가
- **향후 개선 사항** 표 추가:
  - 입 모양 싱크 (립싱크)
  - 배경음악/화자 음성 분리 더빙
  - 다중 화자 구분 및 목소리 다르게
  - 화자 음색 유지 (Voice Cloning)
  - 자막 동기화
  - 더빙 속도 세밀 조정
  - 지원 언어 확장

---

## 프롬프트 노하우 요약

| 패턴 | 예시 |
|------|------|
| 에러 로그 그대로 붙여넣기 | TypeScript 빌드 오류 → 즉시 원인 분석 + 수정 |
| 구체적인 요청 | "비디오 플레이어 만들어줘" 보다 "원본/더빙 영상 좌우 나란히 비교 재생되게" |
| 기능 단위로 하나씩 | UI 개편, 비디오 기능, 싱크 조정을 순차적으로 요청 |
| 방향 먼저 논의 | ElevenLabs Dubbing API 비용 확인 후 적용 여부 결정 |
