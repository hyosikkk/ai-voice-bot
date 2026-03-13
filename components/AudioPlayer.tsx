"use client";

import { useRef, useState, useEffect } from "react";

interface AudioPlayerProps {
  audioUrl: string;
  fileName: string;
  transcription: string;
  translatedText: string;
  targetLanguage: string;
  originalVideoUrl?: string;
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
  originalVideoUrl,
}: AudioPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 오디오 duration 로드
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setDuration(audio.duration);
    audio.addEventListener("loadedmetadata", onLoaded);
    return () => audio.removeEventListener("loadedmetadata", onLoaded);
  }, [audioUrl]);

  // 시간 업데이트
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      video?.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      video?.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = time;
    if (videoRef.current) videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* ===== 비디오 플레이어 (비디오 파일인 경우) ===== */}
      {originalVideoUrl ? (
        <div className="glass rounded-xl overflow-hidden border border-emerald-500/20 bg-emerald-500/5">
          {/* 비디오 화면 */}
          <div className="relative bg-black rounded-t-xl">
            <video
              ref={videoRef}
              src={originalVideoUrl}
              muted
              className="w-full max-h-[360px] object-contain"
              playsInline
            />
            {/* 재생 오버레이 */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
                  <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
            )}
          </div>

          {/* 커스텀 컨트롤 */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-emerald-500/25 flex items-center justify-center">
                <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-emerald-300">더빙 완료 — 비디오 + 더빙 음성</span>
            </div>

            {/* 시크바 */}
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 accent-violet-500 cursor-pointer"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* 재생/정지 버튼 */}
                <button
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center transition-colors"
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <span className="text-xs text-slate-400 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* 다운로드 (음성만) */}
              <a
                href={audioUrl}
                download={fileName}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                음성 다운로드
              </a>
            </div>
          </div>

          {/* 숨김 오디오 */}
          <audio ref={audioRef} src={audioUrl} />
        </div>
      ) : (
        /* ===== 오디오 전용 플레이어 ===== */
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
      )}

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
