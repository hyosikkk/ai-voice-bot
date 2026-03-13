import Link from "next/link";

// 접근 거부 페이지: 화이트리스트에 없는 계정으로 로그인 시도 시 표시
export default function AccessDeniedPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-md text-center">
        {/* 경고 아이콘 */}
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-9 h-9 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 거부</h1>
        <p className="text-gray-500 text-sm mb-8">
          이 서비스는 승인된 계정만 이용할 수 있습니다.
          <br />
          다른 계정으로 로그인하거나 관리자에게 문의하세요.
        </p>

        <Link
          href="/signin"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-8 rounded-xl transition-colors"
        >
          다시 로그인
        </Link>
      </div>
    </div>
  );
}
