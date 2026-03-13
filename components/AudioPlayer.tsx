"use client";

interface AudioPlayerProps {
  audioUrl: string;
  fileName: string;
  transcription: string;
  translatedText: string;
  targetLanguage: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  es: "Español",
};

export default function AudioPlayer({
  audioUrl,
  fileName,
  transcription,
  translatedText,
  targetLanguage,
}: AudioPlayerProps) {
  return (
    <div className="space-y-6">
      {/* 오디오 플레이어 */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          더빙 결과
        </h3>
        <audio controls className="w-full" src={audioUrl}>
          브라우저가 오디오 재생을 지원하지 않습니다.
        </audio>
        <a
          href={audioUrl}
          download={fileName}
          className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          MP3 다운로드
        </a>
      </div>

      {/* 원본 텍스트 (STT 결과) */}
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          원본 인식 텍스트
        </h3>
        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
          {transcription}
        </p>
      </div>

      {/* 번역 텍스트 */}
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          번역 텍스트 ({LANGUAGE_LABELS[targetLanguage] || targetLanguage})
        </h3>
        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
          {translatedText}
        </p>
      </div>
    </div>
  );
}
