import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SignInButton from "./SignInButton";

export default async function SignInPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/");
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4">
      <div className="glass-bright rounded-2xl p-10 w-full max-w-md text-center border border-white/10">
        {/* 로고 */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-2xl shadow-violet-500/30">
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">AI 더빙 서비스</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          서비스를 이용하려면 Google 계정으로 로그인하세요.
          <br />
          <span className="text-xs text-slate-600 mt-1 block">승인된 계정만 접근 가능합니다.</span>
        </p>

        <SignInButton />
      </div>
    </div>
  );
}
