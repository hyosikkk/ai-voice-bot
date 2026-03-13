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
    <div className="space-y-4">
      {/* 오디오 플레이어 */}
      <div className="glass rounded-xl p-5 border border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-emerald-500/25 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-emerald-300">더빙 결과</h3>
        </div>

        <audio controls className="w-full h-10" src={audioUrl} style={{ accentColor: "#7c3aed" }}>
          브라우저가 오디오 재생을 지원하지 않습니다.
        </audio>

        <a
          href={audioUrl}
          download={fileName}
          className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-emerald-400 hover:text-emerald-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          MP3 다운로드
        </a>
      </div>

      {/* 원본 텍스트 (STT 결과) */}
      <div className="glass rounded-xl p-4 border border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">원본 텍스트</span>
          <span className="text-[10px] bg-white/5 text-slate-600 px-1.5 py-0.5 rounded border border-white/5">STT</span>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{transcription}</p>
      </div>

      {/* 번역 텍스트 */}
      <div className="glass rounded-xl p-4 border border-violet-500/15 bg-violet-500/[0.03]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">번역 텍스트</span>
          <span className="text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded border border-violet-500/20 font-mono">
            {LANGUAGE_LABELS[targetLanguage] || targetLanguage}
          </span>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{translatedText}</p>
      </div>
    </div>
  );
}
