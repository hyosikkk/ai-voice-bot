// ElevenLabs API 헬퍼 함수

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

// 지원 언어 목록
export const SUPPORTED_LANGUAGES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "es", label: "Español" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// STT: 오디오/비디오 파일을 텍스트로 변환
export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
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
  return data.text as string;
}

// TTS: 텍스트를 음성으로 변환, MP3 Buffer 반환
export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY가 설정되지 않았습니다");

  // 환경변수로 음성 ID 커스터마이징 가능 (기본값: Rachel)
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

  const response = await fetch(
    `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`,
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

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
