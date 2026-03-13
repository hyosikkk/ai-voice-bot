import type { Metadata } from "next";
import "./globals.css";
import NextAuthSessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "AI 더빙 서비스",
  description: "AI를 활용한 오디오/비디오 더빙 서비스 - ElevenLabs + Claude",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50">
        <NextAuthSessionProvider>
          {/* 상단 헤더 */}
          <header className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span className="text-lg font-bold text-gray-800">AI 더빙</span>
              </div>
              <AuthStatus />
            </div>
          </header>
          <main>{children}</main>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}

// 인증 상태 표시 컴포넌트 (클라이언트 컴포넌트로 분리)
import AuthStatusClient from "@/components/AuthStatus";
function AuthStatus() {
  return <AuthStatusClient />;
}
