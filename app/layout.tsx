import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NextAuthSessionProvider from "@/components/SessionProvider";
import AuthStatusClient from "@/components/AuthStatus";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AI 더빙 서비스",
  description: "ElevenLabs + Claude AI로 만든 AI 더빙 웹 서비스 — 오디오/비디오를 원하는 언어로 자동 더빙",
};

// 인증 상태 래퍼 (서버 컴포넌트에서 클라이언트 컴포넌트 렌더)
function AuthStatus() {
  return <AuthStatusClient />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={inter.variable}>
      <body className="font-sans min-h-screen">
        {/* 애니메이션 배경 — 고정 위치 */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[#050514]" />
          <div
            className="absolute -top-40 left-1/4 w-[700px] h-[700px] rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
              filter: "blur(80px)",
              animation: "blob1 18s ease-in-out infinite alternate",
            }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-15"
            style={{
              background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
              filter: "blur(80px)",
              animation: "blob2 14s ease-in-out infinite alternate",
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
              filter: "blur(60px)",
              animation: "blob3 22s ease-in-out infinite alternate",
            }}
          />
        </div>

        <style>{`
          @keyframes blob1 {
            0% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(5%, 3%) scale(1.1); }
            66% { transform: translate(-3%, 5%) scale(0.95); }
            100% { transform: translate(4%, -4%) scale(1.05); }
          }
          @keyframes blob2 {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-5%, -4%) scale(1.15); }
            100% { transform: translate(3%, 5%) scale(0.9); }
          }
          @keyframes blob3 {
            0% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.2); }
            100% { transform: translate(-50%, -50%) scale(0.85); }
          }
        `}</style>

        <NextAuthSessionProvider>
          {/* 상단 헤더 */}
          <header className="sticky top-0 z-50 glass border-t-0 border-x-0 border-b border-white/[0.06]">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
              {/* 로고 */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <span className="text-base font-bold text-white">AI 더빙</span>
                  <span className="hidden sm:inline text-xs text-slate-500 ml-2 font-mono">ElevenLabs × Claude</span>
                </div>
              </div>

              {/* 우측 메뉴 */}
              <div className="flex items-center gap-2">
                <AuthStatus />
              </div>
            </div>
          </header>

          <main>{children}</main>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
