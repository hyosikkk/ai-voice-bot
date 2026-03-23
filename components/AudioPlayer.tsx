"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface SubtitleCue {
  start: number;
  end: number;
  original: string;
  translated: string;
}

interface SyncEntry {
  origStart: number;
  origEnd: number;
  dubStart: number;
  dubEnd: number;
  rate: number;
}

interface AudioPlayerProps {
  audioUrl: string;
  fileName: string;
  transcription: string;
  translatedText: string;
  targetLanguage: string;
  originalVideoUrl?: string;
  subtitles?: SubtitleCue[];
  syncMap?: SyncEntry[];
}

const LANGUAGE_LABELS: Record<string, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  zh: "中文",
  ar: "العربية",
  it: "Italiano",
  pt: "Português",
};

type SubtitleMode = "off" | "original" | "translated" | "both";

// SRT 형식 생성
function toSRT(cues: SubtitleCue[], mode: "original" | "translated"): string {
  return cues
    .map((c, i) => {
      const fmt = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        const ms = Math.round((s % 1) * 1000);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
      };
      const text = mode === "original" ? c.original : c.translated;
      return `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${text}\n`;
    })
    .join("\n");
}

// ─── 자막 오버레이 ────────────────────────────────────────────────
function SubtitleOverlay({
  cues,
  currentTime,
  mode,
}: {
  cues: SubtitleCue[];
  currentTime: number;
  mode: SubtitleMode;
}) {
  if (mode === "off" || cues.length === 0) return null;
  const active = cues.find((c) => currentTime >= c.start && currentTime <= c.end);
  if (!active) return null;

  return (
    <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none px-4">
      <div className="max-w-[90%] text-center space-y-0.5">
        {(mode === "original" || mode === "both") && (
          <div
            className="inline-block px-3 py-1 rounded text-sm font-medium leading-snug"
            style={{ background: "rgba(0,0,0,0.72)", color: "#e2e8f0", textShadow: "0 1px 3px #000" }}
          >
            {active.original}
          </div>
        )}
        {mode === "both" && <div />}
        {(mode === "translated" || mode === "both") && (
          <div
            className="inline-block px-3 py-1 rounded text-sm font-semibold leading-snug"
            style={{ background: "rgba(0,0,0,0.80)", color: "#c4b5fd", textShadow: "0 1px 4px #000" }}
          >
            {active.translated}
          </div>
        )}
      </div>
    </div>
  );
}

// 세그먼트 인덱스 검색 (이진 탐색)
function findSegmentIndex(syncMap: SyncEntry[], t: number): number {
  for (let i = 0; i < syncMap.length; i++) {
    if (t >= syncMap[i].origStart && t < syncMap[i].origEnd) return i;
  }
  return -1;
}

// syncMap 기준 오디오 목표 위치 계산
function calcDubTime(syncMap: SyncEntry[], videoTime: number): number {
  const idx = findSegmentIndex(syncMap, videoTime);
  if (idx === -1) {
    // 구간 밖: 비례 추정 (마지막 세그먼트 이후 등)
    const last = syncMap[syncMap.length - 1];
    if (last && videoTime >= last.origEnd) return last.dubEnd;
    return 0;
  }
  const s = syncMap[idx];
  return s.dubStart + (videoTime - s.origStart) * s.rate;
}

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
  onRateChange,
  subtitleCues,
  subtitleMode,
  syncMap,
}: {
  label: string;
  badge: string;
  badgeColor: string;
  videoUrl: string;
  audioUrl?: string;
  muted: boolean;
  syncVideoRef?: React.RefObject<HTMLVideoElement | null>;
  syncAudioRef?: React.RefObject<HTMLAudioElement | null>;
  onRateChange?: (rate: number) => void;
  subtitleCues?: SubtitleCue[];
  subtitleMode?: SubtitleMode;
  syncMap?: SyncEntry[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const lastSegIdxRef = useRef(-1);

  // sync refs를 외부로 노출
  useEffect(() => {
    if (syncVideoRef) (syncVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = videoRef.current;
    if (syncAudioRef) (syncAudioRef as React.MutableRefObject<HTMLAudioElement | null>).current = audioRef.current;
  });

  // ── 메타데이터 + 기본 이벤트 ──
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    const timeEl = audioUrl ? audio : video;
    if (!timeEl) return;

    const onTime = () => setCurrentTime(timeEl.currentTime);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    timeEl.addEventListener("timeupdate", onTime);
    timeEl.addEventListener("ended", onEnded);

    if (audioUrl && video && audio) {
      let videoReady = false;
      let audioReady = false;

      const trySync = () => {
        if (!videoReady || !audioReady) return;
        setDuration(video.duration);
        // syncMap이 있으면 per-segment 처리; 없으면 전역 비율
        if (!syncMap || syncMap.length === 0) {
          if (audio.duration > 0 && video.duration > 0) {
            const rate = Math.min(Math.max(audio.duration / video.duration, 0.5), 4.0);
            audio.playbackRate = rate;
            onRateChange?.(rate);
          }
        } else {
          // 첫 세그먼트 rate로 초기 설정
          audio.playbackRate = syncMap[0].rate;
          onRateChange?.(1.0); // 다운로드용 global rate는 1.0 (filter_complex로 처리)
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
  }, [audioUrl, syncMap]);

  // ── 세그먼트별 싱크 (syncMap이 있을 때만) ──
  useEffect(() => {
    if (!audioUrl || !syncMap || syncMap.length === 0) return;
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    const onTimeUpdate = () => {
      const vt = video.currentTime;
      const segIdx = findSegmentIndex(syncMap, vt);
      if (segIdx === -1) return;
      const seg = syncMap[segIdx];

      if (segIdx !== lastSegIdxRef.current) {
        // 세그먼트 경계 진입 → 오디오 위치 하드싱크 + 속도 변경
        const target = seg.dubStart + (vt - seg.origStart) * seg.rate;
        audio.currentTime = target;
        audio.playbackRate = Math.min(Math.max(seg.rate, 0.25), 4.0);
        lastSegIdxRef.current = segIdx;
      } else {
        // 세그먼트 내 드리프트 보정 (±0.3s 이상 벗어나면 재동기)
        const expected = seg.dubStart + (vt - seg.origStart) * seg.rate;
        if (Math.abs(audio.currentTime - expected) > 0.3) {
          audio.currentTime = expected;
        }
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [audioUrl, syncMap]);

  const togglePlay = () => {
    const video = videoRef.current;
    const audio = audioUrl ? audioRef.current : null;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      audio?.pause();
      setIsPlaying(false);
    } else {
      lastSegIdxRef.current = -1; // 재생 재시작 시 세그먼트 리셋
      video.play();
      audio?.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    if (audioUrl && audioRef.current) {
      if (syncMap && syncMap.length > 0) {
        const dubTime = calcDubTime(syncMap, t);
        audioRef.current.currentTime = dubTime;
        const seg = syncMap[findSegmentIndex(syncMap, t)];
        if (seg) audioRef.current.playbackRate = Math.min(Math.max(seg.rate, 0.25), 4.0);
        lastSegIdxRef.current = findSegmentIndex(syncMap, t);
      } else {
        audioRef.current.currentTime = t;
      }
    }
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

        {/* 자막 오버레이 */}
        {subtitleCues && subtitleMode && subtitleMode !== "off" && (
          <SubtitleOverlay
            cues={subtitleCues}
            currentTime={currentTime}
            mode={subtitleMode}
          />
        )}

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

// atempo 체이닝 헬퍼 (범위: 0.5~4.0)
function buildAtempo(rate: number): string {
  const r = Math.min(Math.max(rate, 0.5), 4.0);
  if (r > 2.0) return `atempo=2.0,atempo=${(r / 2.0).toFixed(4)}`;
  return `atempo=${r.toFixed(4)}`;
}

// 세그먼트별 filter_complex 생성
function buildSegmentFilterComplex(syncMap: SyncEntry[]): string | null {
  const parts: string[] = [];
  const labels: string[] = [];

  for (let i = 0; i < syncMap.length; i++) {
    const s = syncMap[i];
    const dubDur = s.dubEnd - s.dubStart;
    if (dubDur < 0.05) continue;
    const atempo = buildAtempo(s.rate);
    const delayMs = Math.round(s.origStart * 1000);
    const label = `s${i}`;
    parts.push(
      `[1:a]atrim=start=${s.dubStart.toFixed(3)}:end=${s.dubEnd.toFixed(3)},asetpts=PTS-STARTPTS,${atempo},adelay=${delayMs}|${delayMs}[${label}]`
    );
    labels.push(`[${label}]`);
  }
  if (labels.length === 0) return null;
  if (labels.length === 1) return parts[0];
  return [
    ...parts,
    `${labels.join("")}amix=inputs=${labels.length}:normalize=0:dropout_transition=0[outa]`,
  ].join(";");
}

// ─── 더빙 비디오 다운로드 버튼 ────────────────────────────────────
function MergeDownloadButton({
  originalVideoUrl,
  audioUrl,
  fileName,
  playbackRate,
  subtitles,
  targetLanguage,
  syncMap,
}: {
  originalVideoUrl: string;
  audioUrl: string;
  fileName: string;
  playbackRate: number;
  subtitles?: SubtitleCue[];
  targetLanguage: string;
  syncMap?: SyncEntry[];
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

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      setStatus("merging");
      await ffmpeg.writeFile("video.mp4", await fetchFile(originalVideoUrl));
      await ffmpeg.writeFile("audio.mp3", await fetchFile(audioUrl));

      const hasSubs = subtitles && subtitles.length > 0;
      if (hasSubs) {
        const srtContent = toSRT(subtitles!, "translated");
        await ffmpeg.writeFile("subtitles.srt", new TextEncoder().encode(srtContent));
      }

      // 세그먼트별 filter_complex 우선, 없으면 전역 atempo 폴백
      const segFilter = syncMap && syncMap.length > 0 ? buildSegmentFilterComplex(syncMap) : null;
      const args: string[] = ["-i", "video.mp4", "-i", "audio.mp3"];
      if (hasSubs) args.push("-i", "subtitles.srt");

      if (segFilter) {
        // filter_complex에서 outa 라벨이 1개면 label 이름이 마지막 [sN]
        const outLabel = syncMap!.filter(s => s.dubEnd - s.dubStart >= 0.05).length === 1
          ? `[s${syncMap!.findIndex(s => s.dubEnd - s.dubStart >= 0.05)}]`
          : "[outa]";
        args.push(
          "-filter_complex", segFilter,
          "-map", "0:v:0",
          "-map", outLabel,
          "-c:v", "libx264", "-preset", "medium", "-crf", "23",
          "-c:a", "aac",
        );
      } else {
        args.push(
          "-c:v", "libx264", "-preset", "medium", "-crf", "23",
          "-c:a", "aac",
          "-af", buildAtempo(playbackRate),
          "-map", "0:v:0",
          "-map", "1:a:0",
        );
      }

      if (hasSubs) {
        const subsInputIdx = 2;
        args.push(
          "-map", `${subsInputIdx}:s:0`,
          "-c:s", "mov_text",
          `-metadata:s:s:0`, `language=${targetLanguage}`,
        );
      }

      if (!segFilter) args.push("-shortest");
      args.push("output.mp4");
      await ffmpeg.exec(args);

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

// ─── 자막 컨트롤 바 ───────────────────────────────────────────────
function SubtitleControls({
  mode,
  onChange,
  subtitleCount,
  subtitles,
  targetLanguage,
}: {
  mode: SubtitleMode;
  onChange: (m: SubtitleMode) => void;
  subtitleCount: number;
  subtitles: SubtitleCue[];
  targetLanguage: string;
}) {
  const modes: { value: SubtitleMode; label: string }[] = [
    { value: "off", label: "끄기" },
    { value: "original", label: "원본" },
    { value: "translated", label: LANGUAGE_LABELS[targetLanguage] || targetLanguage },
    { value: "both", label: "원본+번역" },
  ];

  const downloadSRT = useCallback(
    (type: "original" | "translated") => {
      const content = toSRT(subtitles, type);
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subtitles_${type}.srt`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [subtitles]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 자막 모드 선택 */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">자막</span>
        <div className="flex rounded-lg overflow-hidden border border-white/[0.08] bg-white/[0.03]">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => onChange(m.value)}
              className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                mode === m.value
                  ? "bg-violet-600/40 text-violet-200"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-slate-600 font-mono">{subtitleCount}개</span>
      </div>

      {/* SRT 다운로드 */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => downloadSRT("original")}
          className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded border border-white/[0.06] hover:border-white/[0.12]"
        >
          원본 .srt
        </button>
        <button
          onClick={() => downloadSRT("translated")}
          className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded border border-white/[0.06] hover:border-white/[0.12]"
        >
          번역 .srt
        </button>
      </div>
    </div>
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
  subtitles,
  syncMap,
}: AudioPlayerProps) {
  const isVideo = !!originalVideoUrl;
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>(
    subtitles && subtitles.length > 0 ? "translated" : "off"
  );

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

          {/* 자막 컨트롤 (자막이 있을 때만) */}
          {subtitles && subtitles.length > 0 && (
            <SubtitleControls
              mode={subtitleMode}
              onChange={setSubtitleMode}
              subtitleCount={subtitles.length}
              subtitles={subtitles}
              targetLanguage={targetLanguage}
            />
          )}

          {/* 좌우 비디오 패널 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <VideoPanel
              label="원본 영상"
              badge="Original"
              badgeColor="text-slate-300"
              videoUrl={originalVideoUrl}
              muted={false}
              subtitleCues={subtitles}
              subtitleMode={subtitleMode === "translated" ? "original" : subtitleMode}
            />
            <VideoPanel
              label="더빙 영상"
              badge={LANGUAGE_LABELS[targetLanguage] || targetLanguage}
              badgeColor="text-violet-300"
              videoUrl={originalVideoUrl}
              audioUrl={audioUrl}
              muted={true}
              onRateChange={setPlaybackRate}
              subtitleCues={subtitles}
              subtitleMode={subtitleMode === "original" ? "off" : subtitleMode}
              syncMap={syncMap}
            />
          </div>

          {/* 다운로드 버튼들 */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <MergeDownloadButton
              originalVideoUrl={originalVideoUrl}
              audioUrl={audioUrl}
              fileName={fileName}
              playbackRate={playbackRate}
              subtitles={subtitles}
              targetLanguage={targetLanguage}
              syncMap={syncMap}
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
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={audioUrl}
              download={fileName}
              className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400 hover:text-emerald-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              MP3 다운로드
            </a>
            {subtitles && subtitles.length > 0 && (
              <>
                <button
                  onClick={() => {
                    const blob = new Blob([toSRT(subtitles, "original")], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = "subtitles_original.srt"; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  원본 .srt
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([toSRT(subtitles, "translated")], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = "subtitles_translated.srt"; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  번역 .srt
                </button>
              </>
            )}
          </div>
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
