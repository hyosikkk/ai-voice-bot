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

const STEP_MESSAGES: Record<Step, string> = {
  idle: "",
  uploading: "파일 업로드 중...",
  transcribing: "음성 인식(STT) 처리 중...",
  translating: "Claude로 번역 중...",
  synthesizing: "음성 합성(TTS) 처리 중...",
  done: "더빙 완료!",
  error: "",
};

// 지원 파일 형식
const ACCEPTED_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave",
  "audio/x-wav", "audio/mp4", "audio/ogg", "audio/webm",
  "video/mp4", "video/webm", "video/quicktime",
].join(",");

export default function DubbingForm() {
  const [file, setFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [step, setStep] = useState<Step>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<DubResult | null>(null);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // 파일 크기 안내 (100MB 초과 경고)
    if (selected.size > 100 * 1024 * 1024) {
      setError("파일 크기가 100MB를 초과합니다. 더 작은 파일을 사용해주세요.");
      return;
    }

    setFile(selected);
    setResult(null);
    setError("");
    setStep("idle");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError("");
    setResult(null);

    try {
      // 업로드 + 더빙 파이프라인 (파일을 서버에 직접 전송)
      setStep("uploading");
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      formData.append("targetLanguage", targetLanguage);

      const response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          setStep("transcribing");
          resolve(new Response(xhr.responseText, { status: xhr.status }));
        };
        xhr.onerror = () => reject(new Error("네트워크 오류가 발생했습니다"));
        xhr.open("POST", "/api/dub");
        xhr.send(formData);
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isProcessing = ["uploading", "transcribing", "translating", "synthesizing"].includes(step);

  return (
    <div className="space-y-8">
      {/* 업로드 폼 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 파일 드롭존 */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${file ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-gray-50"}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            className="hidden"
            disabled={isProcessing}
          />
          {file ? (
            <div className="space-y-1">
              <svg className="w-10 h-10 text-blue-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="font-semibold text-blue-700">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <svg className="w-10 h-10 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-600 font-medium">클릭하여 파일 선택</p>
              <p className="text-sm text-gray-400">
                오디오/비디오 파일 지원 (MP3, WAV, MP4, WebM 등) · 최대 100MB
              </p>
            </div>
          )}
        </div>

        {/* 목표 언어 선택 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            더빙할 언어
          </label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            disabled={isProcessing}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={!file || isProcessing}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
        >
          {isProcessing ? "처리 중..." : "더빙 시작"}
        </button>
      </form>

      {/* 진행 상태 표시 */}
      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            <p className="text-blue-700 font-medium">{STEP_MESSAGES[step]}</p>
          </div>
          {step === "uploading" && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>업로드 중</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          {step !== "uploading" && (
            <div className="flex gap-2 text-xs text-gray-500">
              <PipelineStep label="STT" active={step === "transcribing"} done={["translating", "synthesizing"].includes(step)} />
              <span className="text-gray-300">→</span>
              <PipelineStep label="번역" active={step === "translating"} done={step === "synthesizing"} />
              <span className="text-gray-300">→</span>
              <PipelineStep label="TTS" active={step === "synthesizing"} done={false} />
            </div>
          )}
        </div>
      )}

      {/* 오류 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-red-700 font-medium">오류 발생</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={handleReset}
            className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 결과 */}
      {result && step === "done" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">더빙 완료</h2>
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              새 파일 더빙
            </button>
          </div>
          <AudioPlayer
            audioUrl={result.audioUrl}
            fileName={result.fileName}
            transcription={result.transcription}
            translatedText={result.translatedText}
            targetLanguage={targetLanguage}
          />
        </div>
      )}
    </div>
  );
}

// 파이프라인 단계 표시 컴포넌트
function PipelineStep({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={`font-medium ${
        active ? "text-blue-600" : done ? "text-green-600" : "text-gray-400"
      }`}
    >
      {done ? "✓ " : ""}{label}
    </span>
  );
}
