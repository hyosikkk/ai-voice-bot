import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SignInButton from "./SignInButton";

// 로그인 페이지 (서버 컴포넌트)
export default async function SignInPage() {
  const session = await getServerSession(authOptions);

  // 이미 로그인된 경우 메인 페이지로 리다이렉트
  if (session) {
    redirect("/");
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-md text-center">
        {/* 로고 */}
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-9 h-9 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">AI 더빙 서비스</h1>
        <p className="text-gray-500 text-sm mb-8">
          서비스를 이용하려면 Google 계정으로 로그인하세요.
          <br />
          <span className="text-xs text-gray-400 mt-1 block">
            승인된 계정만 접근 가능합니다.
          </span>
        </p>

        <SignInButton />
      </div>
    </div>
  );
}
