"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import AudioPlayer from "./AudioPlayer";
import { SUPPORTED_LANGUAGES } from "@/lib/elevenlabs";

type DubResult = {
  transcription: string;
  translatedText: string;
  audioUrl: string;
  fileName: string;
};

type Step = "idle" | "uploading" | "transcribing" | "translating" | "synthesizing" | "done" | "error";

const ACCEPTED_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave",
  "audio/x-wav", "audio/mp4", "audio/ogg", "audio/webm",
  "video/mp4", "video/webm", "video/quicktime",
].join(",");

// 파이프라인 진행 단계 정보
const PROCESS_STEPS: { key: Step; label: string; sublabel: string; icon: string }[] = [
  { key: "uploading",    label: "파일 업로드",    sublabel: "Vercel Blob",   icon: "⬆️" },
  { key: "transcribing", label: "음성 인식 STT",  sublabel: "ElevenLabs",   icon: "🎙️" },
  { key: "translating",  label: "AI 번역",        sublabel: "Claude AI",    icon: "🌐" },
  { key: "synthesizing", label: "음성 합성 TTS",  sublabel: "ElevenLabs",   icon: "🔊" },
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

  const handleFileChange = (selected: File | null | undefined) => {
    if (!selected) return;
    if (selected.size > 500 * 1024 * 1024) {
      setError("파일 크기가 500MB를 초과합니다. 더 작은 파일을 사용해주세요.");
      return;
    }
    // 기존 오브젝트 URL 해제
    if (originalVideoUrl) URL.revokeObjectURL(originalVideoUrl);

    if (selected.type.startsWith("video/")) {
      setOriginalVideoUrl(URL.createObjectURL(selected));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError("");
    setResult(null);

    try {
      // 1단계: Vercel Blob에 직접 업로드 (최대 500MB)
      setStep("uploading");
      setUploadProgress(0);

      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        onUploadProgress: ({ percentage }) => {
          setUploadProgress(Math.round(percentage));
        },
      });

      // 2~4단계: 서버에서 STT → 번역 → TTS 처리
      setStep("transcribing");

      const response = await fetch("/api/dub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blobUrl: blob.url,
          targetLanguage,
          fileName: file.name,
        }),
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isProcessing = ["uploading", "transcribing", "translating", "synthesizing"].includes(step);

  return (
    <div className="space-y-6">
      {/* 업로드 폼 */}
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
          onClick={() => !isProcessing && fileInputRef.current?.click()}
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
            disabled={isProcessing}
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
              {!isProcessing && (
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
                <p className="text-xs text-slate-600 mt-1">MP3, WAV, MP4, WebM 등 · 최대 500MB</p>
              </div>
            </div>
          )}
        </div>

        {/* 목표 언어 선택 */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            더빙 목표 언어
          </label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            disabled={isProcessing}
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
          disabled={!file || isProcessing}
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
          ) : "더빙 시작 →"}
        </button>
      </form>

      {/* ===== 진행 상태 표시 ===== */}
      {isProcessing && (
        <div className="glass rounded-xl p-5 border border-violet-500/20 space-y-4">
          {/* 헤더 */}
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <p className="text-sm font-semibold text-violet-300">AI 더빙 파이프라인 실행 중</p>
          </div>

          {/* 단계 목록 */}
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
                  {/* 상태 아이콘 */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                    status === "active"
                      ? "bg-violet-500/30 neon-ring"
                      : status === "done"
                        ? "bg-emerald-500/25"
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

                  {/* 단계명 */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${
                      status === "active" ? "text-violet-200"
                      : status === "done" ? "text-emerald-400"
                      : "text-slate-600"
                    }`}>
                      {ps.label}
                    </span>
                    <span className={`ml-2 text-xs font-mono ${
                      status === "active" ? "text-violet-500" : "text-slate-700"
                    }`}>
                      {ps.sublabel}
                    </span>
                  </div>

                  {/* 업로드 진행률 */}
                  {ps.key === "uploading" && status === "active" && (
                    <span className="text-xs font-mono text-violet-400 flex-shrink-0">{uploadProgress}%</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 업로드 프로그레스 바 */}
          {step === "uploading" && (
            <div>
              <div className="w-full bg-white/5 rounded-full h-1">
                <div
                  className="h-1 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <p className="text-xs text-slate-600 text-center">
            최대 5분 소요될 수 있습니다
          </p>
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
            <button
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
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
