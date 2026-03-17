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

// ─── 비디오 패널 (원본 or 더빙) ──────────────────────────────────
function VideoPanel({
  label,
  badge,
  badgeColor,
  videoUrl,
  audioUrl,
  muted,
  syncVideoRef,
  syncAudioRef,
}: {
  label: string;
  badge: string;
  badgeColor: string;
  videoUrl: string;
  audioUrl?: string;
  muted: boolean;
  syncVideoRef?: React.RefObject<HTMLVideoElement | null>;
  syncAudioRef?: React.RefObject<HTMLAudioElement | null>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // sync refs를 외부로 노출
  useEffect(() => {
    if (syncVideoRef) (syncVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = videoRef.current;
    if (syncAudioRef) (syncAudioRef as React.MutableRefObject<HTMLAudioElement | null>).current = audioRef.current;
  });

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    const timeEl = audioUrl ? audio : video;
    if (!timeEl) return;

    const onTime = () => setCurrentTime(timeEl.currentTime);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    timeEl.addEventListener("timeupdate", onTime);
    timeEl.addEventListener("ended", onEnded);

    // 더빙 패널: 비디오와 오디오 둘 다 로드되면 playbackRate 자동 조정
    if (audioUrl && video && audio) {
      let videoReady = false;
      let audioReady = false;

      const trySync = () => {
        if (!videoReady || !audioReady) return;
        setDuration(video.duration);
        if (audio.duration > 0 && video.duration > 0) {
          const rate = Math.min(Math.max(audio.duration / video.duration, 0.5), 4.0);
          // 더빙 음성의 재생 속도를 조정해 영상 길이에 맞춤
          audio.playbackRate = rate;
        }
      };

      const onVideoMeta = () => { videoReady = true; trySync(); };
      const onAudioMeta = () => { audioReady = true; trySync(); };
      video.addEventListener("loadedmetadata", onVideoMeta);
      audio.addEventListener("loadedmetadata", onAudioMeta);
      return () => {
        timeEl.removeEventListener("timeupdate", onTime);
        timeEl.removeEventListener("ended", onEnded);
        video.removeEventListener("loadedmetadata", onVideoMeta);
        audio.removeEventListener("loadedmetadata", onAudioMeta);
      };
    }

    // 원본 패널
    const onMeta = () => setDuration(timeEl.duration);
    timeEl.addEventListener("loadedmetadata", onMeta);
    return () => {
      timeEl.removeEventListener("loadedmetadata", onMeta);
      timeEl.removeEventListener("timeupdate", onTime);
      timeEl.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    const audio = audioUrl ? audioRef.current : null;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      audio?.pause();
      setIsPlaying(false);
    } else {
      video.play();
      audio?.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    if (audioUrl && audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-white/10 bg-black/40">
      {/* 라벨 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
        <span className={`text-xs font-semibold ${badgeColor}`}>{label}</span>
        <span className="text-[10px] text-slate-600 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
          {badge}
        </span>
      </div>

      {/* 비디오 화면 */}
      <div
        className="relative bg-black aspect-video cursor-pointer"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          muted={muted}
          className="w-full h-full object-contain"
          playsInline
        />
        {audioUrl && <audio ref={audioRef} src={audioUrl} />}

        {/* 재생 오버레이 */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
          !isPlaying || isHovering ? "opacity-100" : "opacity-0"
        }`}>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-sm border transition-all duration-200 ${
            isPlaying
              ? "bg-black/30 border-white/20 opacity-70"
              : "bg-black/50 border-white/30"
          }`}>
            {isPlaying ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* 컨트롤 바 */}
      <div className="px-4 pt-3 pb-4 space-y-2 bg-[#0a0a1a]">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #7c3aed ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) 0%)`,
          }}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center transition-colors"
            >
              {isPlaying ? (
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <span className="text-xs font-mono text-slate-500">
              {fmt(currentTime)} / {fmt(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 더빙 비디오 다운로드 버튼 ────────────────────────────────────
function MergeDownloadButton({
  originalVideoUrl,
  audioUrl,
  fileName,
}: {
  originalVideoUrl: string;
  audioUrl: string;
  fileName: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "merging" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDownload = async () => {
    setStatus("loading");
    setProgress(0);
    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress: p }) => {
        setProgress(Math.round(p * 100));
      });

      setStatus("loading");
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      setStatus("merging");
      await ffmpeg.writeFile("video.mp4", await fetchFile(originalVideoUrl));
      await ffmpeg.writeFile("audio.mp3", await fetchFile(audioUrl));
      await ffmpeg.exec([
        "-i", "video.mp4",
        "-i", "audio.mp3",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-c:a", "aac",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-shortest",
        "output.mp4",
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await ffmpeg.readFile("output.mp4");
      const buf: ArrayBuffer = (data as Uint8Array).buffer.slice(0) as ArrayBuffer;
      const blob = new Blob([buf], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dubbed_" + fileName.replace(/\.[^.]+$/, ".mp4");
      a.click();
      URL.revokeObjectURL(url);
      setStatus("done");
    } catch (e) {
      setErrorMsg((e as Error).message);
      setStatus("error");
    }
  };

  if (status === "idle") {
    return (
      <button
        onClick={handleDownload}
        className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/25 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        더빙 비디오 다운로드 (.mp4)
      </button>
    );
  }

  if (status === "loading") {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-slate-400 px-4 py-2">
        <svg className="w-3.5 h-3.5 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        WASM 엔진 로딩 중... (최초 1회, ~30MB)
      </div>
    );
  }

  if (status === "merging") {
    return (
      <div className="flex items-center gap-3 text-xs text-slate-400 px-1">
        <svg className="w-3.5 h-3.5 animate-spin text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span>비디오 + 음성 합치는 중...</span>
            <span className="text-violet-400 font-mono">{progress}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1">
            <div
              className="h-1 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-emerald-400 px-4 py-2">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        다운로드 완료
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs text-red-400 px-4 py-2">
      오류: {errorMsg.slice(0, 40)}
    </span>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
export default function AudioPlayer({
  audioUrl,
  fileName,
  transcription,
  translatedText,
  targetLanguage,
  originalVideoUrl,
}: AudioPlayerProps) {
  const isVideo = !!originalVideoUrl;

  return (
    <div className="space-y-4">
      {isVideo ? (
        /* ===== 비디오 모드: 좌우 패널 ===== */
        <div className="space-y-3">
          {/* 완료 헤더 */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/25 flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-emerald-300">더빙 완료</span>
          </div>

          {/* 좌우 비디오 패널 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <VideoPanel
              label="원본 영상"
              badge="Original"
              badgeColor="text-slate-300"
              videoUrl={originalVideoUrl}
              muted={false}
            />
            <VideoPanel
              label="더빙 영상"
              badge={LANGUAGE_LABELS[targetLanguage] || targetLanguage}
              badgeColor="text-violet-300"
              videoUrl={originalVideoUrl}
              audioUrl={audioUrl}
              muted={true}
            />
          </div>

          {/* 다운로드 버튼들 */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <MergeDownloadButton
              originalVideoUrl={originalVideoUrl}
              audioUrl={audioUrl}
              fileName={fileName}
            />
            <a
              href={audioUrl}
              download={fileName}
              className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              음성만 다운로드 (.mp3)
            </a>
          </div>
        </div>
      ) : (
        /* ===== 오디오 전용 모드 ===== */
        <div className="glass rounded-xl p-5 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-emerald-500/25 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-emerald-300">더빙 결과</h3>
          </div>
          <audio controls className="w-full h-10" src={audioUrl} style={{ accentColor: "#7c3aed" }} />
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

      {/* 원본 텍스트 */}
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
