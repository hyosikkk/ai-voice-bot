import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DubbingForm from "@/components/DubbingForm";

// 파이프라인 단계 정보
const PIPELINE_STEPS = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    label: "파일 업로드",
    desc: "오디오 또는 비디오 파일을 업로드합니다",
    badge: null,
    color: "from-violet-500/20 to-violet-500/5",
    border: "border-violet-500/20",
    iconBg: "bg-violet-500/20 text-violet-400",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
    label: "음성 인식 (STT)",
    desc: "음성을 텍스트로 변환합니다",
    badge: "ElevenLabs",
    color: "from-fuchsia-500/20 to-fuchsia-500/5",
    border: "border-fuchsia-500/20",
    iconBg: "bg-fuchsia-500/20 text-fuchsia-400",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    ),
    label: "AI 번역",
    desc: "원하는 언어로 번역합니다",
    badge: "Claude AI",
    color: "from-amber-500/20 to-amber-500/5",
    border: "border-amber-500/20",
    iconBg: "bg-amber-500/20 text-amber-400",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072M12 9.5l.01-.01M6.464 15.536a5 5 0 010-7.072M12 18a6 6 0 100-12 6 6 0 000 12z" />
      </svg>
    ),
    label: "음성 합성 (TTS)",
    desc: "번역된 텍스트를 자연스러운 음성으로 변환합니다",
    badge: "ElevenLabs",
    color: "from-cyan-500/20 to-cyan-500/5",
    border: "border-cyan-500/20",
    iconBg: "bg-cyan-500/20 text-cyan-400",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    label: "다운로드",
    desc: "더빙된 MP3 파일을 다운로드합니다",
    badge: null,
    color: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/20",
    iconBg: "bg-emerald-500/20 text-emerald-400",
  },
];

// 기술 스택 배지
const TECH_BADGES = [
  { label: "ElevenLabs", desc: "STT · TTS", color: "bg-violet-500/15 text-violet-300 border-violet-500/25" },
  { label: "Claude AI", desc: "번역", color: "bg-amber-500/15 text-amber-300 border-amber-500/25" },
  { label: "Next.js 15", desc: "App Router", color: "bg-white/10 text-slate-300 border-white/15" },
  { label: "Vercel", desc: "배포", color: "bg-white/10 text-slate-300 border-white/15" },
  { label: "Turso", desc: "DB", color: "bg-teal-500/15 text-teal-300 border-teal-500/25" },
  { label: "TypeScript", desc: "언어", color: "bg-blue-500/15 text-blue-300 border-blue-500/25" },
];

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">

      {/* ===== 히어로 섹션 ===== */}
      <section className="text-center space-y-6 pt-4">
        {/* 음파 시각화 (장식) */}
        <div className="flex items-end justify-center gap-1 h-10 mb-2">
          {[...Array(14)].map((_, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full bg-gradient-to-t from-violet-500 to-cyan-400 sb-${(i % 7) + 1}`}
              style={{ minHeight: "6px" }}
            />
          ))}
        </div>

        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="gradient-text">AI 더빙 서비스</span>
          </h1>
          <p className="mt-4 text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            오디오 또는 비디오 파일을 업로드하면{" "}
            <span className="text-violet-400 font-semibold">ElevenLabs</span>와{" "}
            <span className="text-amber-400 font-semibold">Claude AI</span>가
            자동으로 원하는 언어로 더빙합니다
          </p>
        </div>

        {/* 기술 스택 배지 */}
        <div className="flex flex-wrap justify-center gap-2">
          {TECH_BADGES.map((b) => (
            <span
              key={b.label}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${b.color}`}
            >
              <span className="font-semibold">{b.label}</span>
              <span className="opacity-60">·</span>
              <span className="opacity-70">{b.desc}</span>
            </span>
          ))}
        </div>
      </section>

      {/* ===== 메인 폼 ===== */}
      <section>
        <div className="glass-bright rounded-2xl p-6 sm:p-8">
          <DubbingForm />
        </div>
      </section>

      {/* ===== 동작 방식 ===== */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">동작 방식</h2>
          <p className="mt-2 text-slate-500 text-sm">5단계 AI 파이프라인으로 자동 더빙 완성</p>
        </div>

        {/* 파이프라인 카드 (모바일: 세로, 데스크탑: 가로) */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-0">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={i} className="flex sm:flex-col items-center gap-2 w-full sm:flex-1">
              {/* 카드 */}
              <div
                className={`w-full sm:w-auto glass rounded-xl p-4 border ${step.border} bg-gradient-to-br ${step.color} flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2`}
              >
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${step.iconBg}`}>
                  {step.icon}
                </div>
                <div className="flex-1 sm:flex-none sm:w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{step.label}</span>
                    {step.badge && (
                      <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded-md border border-white/10">
                        {step.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed hidden sm:block">{step.desc}</p>
                </div>
                <div className="hidden sm:flex items-center justify-center w-5 h-5 rounded-full bg-white/5 text-slate-500 text-xs font-bold flex-shrink-0 self-start">
                  {i + 1}
                </div>
              </div>

              {/* 연결 화살표 */}
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="flex-shrink-0">
                  {/* 모바일: 아래 화살표 */}
                  <div className="sm:hidden flex flex-col items-center gap-0.5">
                    <div className="w-px h-3 pipeline-flow rounded-full" />
                    <svg className="w-3 h-3 text-slate-600" fill="currentColor" viewBox="0 0 10 10">
                      <path d="M5 8L1 2h8z" />
                    </svg>
                  </div>
                  {/* 데스크탑: 옆 화살표 */}
                  <div className="hidden sm:flex flex-col items-center gap-0.5">
                    <div className="h-px w-6 pipeline-flow rounded-full" />
                    <svg className="w-3 h-3 text-slate-600 -mt-1.5 ml-3" fill="currentColor" viewBox="0 0 10 10">
                      <path d="M8 5L2 1v8z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== 지원 언어 ===== */}
      <section className="text-center pb-4">
        <p className="text-xs text-slate-600">
          지원 언어 &nbsp;·&nbsp; 한국어 &nbsp;·&nbsp; English &nbsp;·&nbsp; 日本語 &nbsp;·&nbsp; Español
        </p>
      </section>

    </div>
  );
}
