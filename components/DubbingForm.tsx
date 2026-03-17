"use client";

import { useState, useRef } from "react";
import AudioPlayer from "./AudioPlayer";
import { SUPPORTED_LANGUAGES } from "@/lib/elevenlabs";

type DubResult = {
  transcription: string;
  translatedText: string;
  audioUrl: string;
  fileName: string;
};

type Step = "idle" | "uploading" | "transcribing" | "translating" | "synthesizing" | "done" | "error";
type CropStatus = "idle" | "loading" | "cropping";

const ACCEPTED_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave",
  "audio/x-wav", "audio/mp4", "audio/ogg", "audio/webm",
  "video/mp4", "video/webm", "video/quicktime",
].join(",");

const PROCESS_STEPS: { key: Step; label: string; sublabel: string }[] = [
  { key: "uploading",    label: "파일 업로드",   sublabel: "Vercel Blob" },
  { key: "transcribing", label: "음성 인식 STT", sublabel: "ElevenLabs"  },
  { key: "translating",  label: "AI 번역",       sublabel: "Claude AI"   },
  { key: "synthesizing", label: "음성 합성 TTS", sublabel: "ElevenLabs"  },
];

const STEP_ORDER: Step[] = ["uploading", "transcribing", "translating", "synthesizing", "done"];

function getStepStatus(current: Step, target: Step): "done" | "active" | "pending" {
  const ci = STEP_ORDER.indexOf(current);
  const ti = STEP_ORDER.indexOf(target);
  if (current === "done") return "done";
  if (ti < ci) return "done";
  if (ti === ci) return "active";
  return "pending";
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function DubbingForm() {
  const [file, setFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [step, setStep] = useState<Step>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<DubResult | null>(null);
  const [error, setError] = useState<string>("");
  const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 크롭 상태
  const [videoDuration, setVideoDuration] = useState(0);
  const [showCropUI, setShowCropUI] = useState(false);
  const [cropStart, setCropStart] = useState(0);
  const [cropStatus, setCropStatus] = useState<CropStatus>("idle");
  const [cropProgress, setCropProgress] = useState(0);

  const handleFileChange = (selected: File | null | undefined) => {
    if (!selected) return;
    if (selected.size > 100 * 1024 * 1024) {
      setError("파일 크기가 100MB를 초과합니다. 더 작은 파일을 사용해주세요.");
      return;
    }
    if (originalVideoUrl) URL.revokeObjectURL(originalVideoUrl);

    setShowCropUI(false);
    setVideoDuration(0);
    setCropStart(0);

    if (selected.type.startsWith("video/")) {
      const url = URL.createObjectURL(selected);
      setOriginalVideoUrl(url);

      // 영상 길이 확인
      const vid = document.createElement("video");
      vid.src = url;
      vid.onloadedmetadata = () => {
        setVideoDuration(vid.duration);
        if (vid.duration > 60) setShowCropUI(true);
      };
    } else {
      setOriginalVideoUrl(null);
    }

    setFile(selected);
    setResult(null);
    setError("");
    setStep("idle");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files?.[0]);
  };

  // ffmpeg.wasm으로 1분 크롭
  const handleCrop = async () => {
    if (!file || !originalVideoUrl) return;
    setCropStatus("loading");
    setCropProgress(0);

    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress: p }) => {
        setCropProgress(Math.round(p * 100));
      });

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      setCropStatus("cropping");
      await ffmpeg.writeFile("input.mp4", await fetchFile(file));
      await ffmpeg.exec([
        "-ss", String(cropStart),
        "-i", "input.mp4",
        "-t", "60",
        "-c", "copy",
        "output.mp4",
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await ffmpeg.readFile("output.mp4");
      const buf = (data as Uint8Array).buffer.slice(0) as ArrayBuffer;
      const croppedBlob = new Blob([buf], { type: "video/mp4" });
      const croppedFile = new File([croppedBlob], `cropped_${file.name}`, { type: "video/mp4" });

      URL.revokeObjectURL(originalVideoUrl);
      const newUrl = URL.createObjectURL(croppedBlob);
      setOriginalVideoUrl(newUrl);
      setFile(croppedFile);
      setShowCropUI(false);
      setVideoDuration(0);
    } catch (err) {
      setError(`크롭 실패: ${(err as Error).message}`);
    } finally {
      setCropStatus("idle");
      setCropProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError("");
    setResult(null);

    try {
      setStep("uploading");
      setUploadProgress(0);

      const CHUNK_SIZE = 4 * 1024 * 1024;
      const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const chunkUrls: string[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
        const formData = new FormData();
        formData.append("chunk", chunk, `chunk_${i}`);
        formData.append("uploadId", uploadId);
        formData.append("partNumber", String(i));

        const res = await fetch("/api/upload-chunk", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `파일 업로드 실패 (${i + 1}/${totalChunks})`);
        }
        const { chunkUrl } = await res.json();
        chunkUrls.push(chunkUrl);
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      setStep("transcribing");

      const response = await fetch("/api/dub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunkUrls, targetLanguage, fileName: file.name, mimeType: file.type }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "더빙 처리 중 오류가 발생했습니다");
      }

      const data = await response.json();
      setResult(data);
      setStep("done");
    } catch (err) {
      setError((err as Error).message);
      setStep("error");
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError("");
    setStep("idle");
    setUploadProgress(0);
    if (originalVideoUrl) URL.revokeObjectURL(originalVideoUrl);
    setOriginalVideoUrl(null);
    setShowCropUI(false);
    setVideoDuration(0);
    setCropStart(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isProcessing = ["uploading", "transcribing", "translating", "synthesizing"].includes(step);
  const isCropping = cropStatus !== "idle";

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 파일 드롭존 */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
            ${isDragging
              ? "border-violet-400 bg-violet-500/10"
              : file
                ? "border-violet-500/50 bg-violet-500/5"
                : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
            }`}
          onClick={() => !isProcessing && !isCropping && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={(e) => handleFileChange(e.target.files?.[0])}
            className="hidden"
            disabled={isProcessing || isCropping}
          />
          {file ? (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-xl bg-violet-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <p className="font-semibold text-violet-300 text-sm">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              {!isProcessing && !isCropping && (
                <p className="text-xs text-slate-600">클릭하여 파일 변경</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-slate-300 font-medium text-sm">클릭하거나 파일을 드래그하세요</p>
                <p className="text-xs text-slate-600 mt-1">MP3, WAV, MP4, WebM 등 · 최대 100MB</p>
              </div>
            </div>
          )}
        </div>

        {/* ===== 1분 크롭 UI ===== */}
        {showCropUI && !isProcessing && (
          <div className="glass rounded-xl border border-cyan-500/20 bg-cyan-500/5 overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-cyan-300">1분 크롭</span>
                <span className="text-xs text-slate-500">영상 전체 길이: {fmtTime(videoDuration)}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCropUI(false)}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                건너뛰기
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 미리보기 + 슬라이더 */}
              {originalVideoUrl && (
                <video
                  src={originalVideoUrl}
                  className="w-full rounded-lg max-h-40 object-contain bg-black/30"
                  controls
                  playsInline
                />
              )}

              {/* 시간 범위 표시 */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400">{fmtTime(cropStart)}</span>
                <span className="text-slate-500">→</span>
                <span className="text-cyan-400">{fmtTime(Math.min(cropStart + 60, videoDuration))}</span>
              </div>

              {/* 시작 지점 슬라이더 */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500">시작 지점 선택</label>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, videoDuration - 60)}
                  step={1}
                  value={cropStart}
                  onChange={(e) => setCropStart(Number(e.target.value))}
                  disabled={isCropping}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-50"
                  style={{
                    background: `linear-gradient(to right, #06b6d4 ${(cropStart / Math.max(1, videoDuration - 60)) * 100}%, rgba(255,255,255,0.1) 0%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-slate-600">
                  <span>{fmtTime(0)}</span>
                  <span>{fmtTime(Math.max(0, videoDuration - 60))}</span>
                </div>
              </div>

              {/* 크롭 진행 표시 */}
              {isCropping && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {cropStatus === "loading" ? "WASM 엔진 로딩 중..." : "크롭 처리 중..."}
                    </span>
                    {cropStatus === "cropping" && (
                      <span className="text-cyan-400 font-mono">{cropProgress}%</span>
                    )}
                  </div>
                  {cropStatus === "cropping" && (
                    <div className="w-full bg-white/5 rounded-full h-1">
                      <div
                        className="h-1 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-200"
                        style={{ width: `${cropProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 버튼 */}
              {!isCropping && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCrop}
                    className="flex-1 py-2.5 px-4 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-sm font-semibold rounded-xl transition-all"
                  >
                    ✂️ {fmtTime(cropStart)} ~ {fmtTime(Math.min(cropStart + 60, videoDuration))} 크롭
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCropUI(false)}
                    className="py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 text-sm rounded-xl transition-all"
                  >
                    전체 더빙
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 목표 언어 선택 */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            더빙 목표 언어
          </label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            disabled={isProcessing || isCropping}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 disabled:opacity-50 cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-[#1a1a2e] text-white">
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={!file || isProcessing || isCropping}
          className="btn-glow w-full py-3.5 px-6 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:from-slate-700 disabled:to-slate-700 disabled:shadow-none text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed text-sm"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              처리 중...
            </span>
          ) : isCropping ? "크롭 중..." : "더빙 시작 →"}
        </button>
      </form>

      {/* ===== 진행 상태 표시 ===== */}
      {isProcessing && (
        <div className="glass rounded-xl p-5 border border-violet-500/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <p className="text-sm font-semibold text-violet-300">AI 더빙 파이프라인 실행 중</p>
          </div>
          <div className="space-y-2">
            {PROCESS_STEPS.map((ps, i) => {
              const status = getStepStatus(step, ps.key);
              return (
                <div
                  key={ps.key}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-500 ${
                    status === "active"
                      ? "bg-violet-500/10 border border-violet-500/30 proc-active"
                      : status === "done"
                        ? "bg-emerald-500/5 border border-emerald-500/20"
                        : "bg-white/[0.02] border border-white/5"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                    status === "active" ? "bg-violet-500/30 neon-ring"
                    : status === "done" ? "bg-emerald-500/25"
                    : "bg-white/5"
                  }`}>
                    {status === "done"
                      ? <span className="text-emerald-400 text-xs">✓</span>
                      : status === "active"
                        ? <svg className="w-3.5 h-3.5 text-violet-300 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        : <span className="text-slate-600 text-xs">{i + 1}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${
                      status === "active" ? "text-violet-200"
                      : status === "done" ? "text-emerald-400"
                      : "text-slate-600"
                    }`}>{ps.label}</span>
                    <span className={`ml-2 text-xs font-mono ${
                      status === "active" ? "text-violet-500" : "text-slate-700"
                    }`}>{ps.sublabel}</span>
                  </div>
                  {ps.key === "uploading" && status === "active" && (
                    <span className="text-xs font-mono text-violet-400 flex-shrink-0">{uploadProgress}%</span>
                  )}
                </div>
              );
            })}
          </div>
          {step === "uploading" && (
            <div className="w-full bg-white/5 rounded-full h-1">
              <div
                className="h-1 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
          <p className="text-xs text-slate-600 text-center">최대 5분 소요될 수 있습니다</p>
        </div>
      )}

      {/* ===== 오류 메시지 ===== */}
      {error && (
        <div className="glass rounded-xl p-5 border border-red-500/25 bg-red-500/5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-red-300 font-medium text-sm">오류가 발생했습니다</p>
              <p className="text-red-400/70 text-xs mt-1">{error}</p>
              <button
                onClick={handleReset}
                className="mt-3 text-xs text-red-400 hover:text-red-200 transition-colors underline underline-offset-2"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 결과 ===== */}
      {result && step === "done" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <h2 className="text-base font-semibold text-white">더빙 완료</h2>
            </div>
            <button onClick={handleReset} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              새 파일 더빙 →
            </button>
          </div>
          <AudioPlayer
            audioUrl={result.audioUrl}
            fileName={result.fileName}
            transcription={result.transcription}
            translatedText={result.translatedText}
            targetLanguage={targetLanguage}
            originalVideoUrl={originalVideoUrl ?? undefined}
          />
        </div>
      )}
    </div>
  );
}
