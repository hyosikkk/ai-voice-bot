// ElevenLabs API 헬퍼 함수

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

// 지원 언어 목록
export const SUPPORTED_LANGUAGES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export interface WordTimestamp {
  text: string;
  start: number;
  end: number;
  type: "word" | "spacing" | "audio_event";
}

export interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

export interface CharacterAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

// 세그먼트별 원본↔더빙 타임라인 매핑
export interface SyncEntry {
  origStart: number;
  origEnd: number;
  dubStart: number;
  dubEnd: number;
  /** 더빙 길이 / 원본 길이 — 재생 속도 배율 */
  rate: number;
}

/**
 * ElevenLabs 캐릭터 정렬 데이터를 이용해 세그먼트별 SyncEntry를 계산한다.
 * segmentTexts 는 " "로 이어 붙인 TTS 입력 텍스트의 각 부분이어야 한다.
 */
export function computeSyncMap(
  segmentTexts: string[],
  origSegments: SubtitleSegment[],
  alignment: CharacterAlignment
): SyncEntry[] {
  const { character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment;
  const result: SyncEntry[] = [];
  let charOffset = 0;

  for (let i = 0; i < segmentTexts.length; i++) {
    const text = segmentTexts[i];
    const len = text.length;
    const startIdx = Math.min(charOffset, starts.length - 1);
    const endIdx = Math.min(charOffset + len - 1, ends.length - 1);

    const dubStart = starts[startIdx] ?? 0;
    const dubEnd = ends[endIdx] ?? dubStart;
    const origDur = origSegments[i].end - origSegments[i].start;
    const dubDur = dubEnd - dubStart;
    // 원본 발화 길이가 0이면 1.0 폴백
    const rate = origDur > 0 && dubDur > 0 ? dubDur / origDur : 1.0;

    result.push({
      origStart: origSegments[i].start,
      origEnd: origSegments[i].end,
      dubStart,
      dubEnd,
      rate: Math.min(Math.max(rate, 0.25), 4.0),
    });

    charOffset += len + 1; // 세그먼트 사이 공백 1자
  }
  return result;
}

// 단어 타임스탬프 배열을 자막 세그먼트로 그룹화
// 문장 부호, 0.8초 이상 무음, 최대 5초 기준으로 분할
export function createSubtitleSegments(words: WordTimestamp[]): SubtitleSegment[] {
  const onlyWords = words.filter((w) => w.type === "word");
  if (onlyWords.length === 0) return [];

  const segments: SubtitleSegment[] = [];
  let segStart = onlyWords[0].start;
  let segWords: string[] = [];
  let lastEnd = onlyWords[0].end;

  const flush = (end: number) => {
    if (segWords.length > 0) {
      segments.push({ start: segStart, end, text: segWords.join(" ").trim() });
      segWords = [];
    }
  };

  for (let i = 0; i < onlyWords.length; i++) {
    const w = onlyWords[i];
    // 무음 구간 > 0.8s 또는 세그먼트 길이 > 5s → 새 세그먼트
    if (i > 0 && (w.start - lastEnd > 0.8 || (segWords.length > 0 && w.end - segStart > 5.0))) {
      flush(lastEnd);
      segStart = w.start;
    }
    segWords.push(w.text);
    lastEnd = w.end;
    // 문장 부호로 끝나면 즉시 분할
    if (/[.!?。？！]$/.test(w.text)) {
      flush(w.end);
      if (i + 1 < onlyWords.length) segStart = onlyWords[i + 1].start;
    }
  }
  flush(lastEnd);
  return segments;
}

// STT: 오디오/비디오 파일을 텍스트 + 단어 타임스탬프로 변환
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<{ text: string; words: WordTimestamp[] }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY가 설정되지 않았습니다");

  const formData = new FormData();
  // scribe_v1: 다국어 자동 감지 지원 모델
  formData.append("model_id", "scribe_v1");
  // Buffer를 Uint8Array로 변환하여 Blob 생성 (TypeScript 타입 호환성)
  formData.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)], { type: mimeType }),
    "audio.file"
  );

  const response = await fetch(`${ELEVENLABS_API_BASE}/speech-to-text`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs STT 오류 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    text: data.text as string,
    words: (data.words ?? []) as WordTimestamp[],
  };
}

// TTS: 텍스트를 음성으로 변환, MP3 Buffer + 캐릭터 정렬 반환
export async function synthesizeSpeech(
  text: string
): Promise<{ audio: Buffer; alignment: CharacterAlignment }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY가 설정되지 않았습니다");

  // 환경변수로 음성 ID 커스터마이징 가능 (기본값: Rachel)
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

  const response = await fetch(
    `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        // 다국어 지원 모델 (한국어, 영어, 일본어, 스페인어 등 지원)
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs TTS 오류 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    audio: Buffer.from(data.audio_base64 as string, "base64"),
    alignment: data.alignment as CharacterAlignment,
  };
}
