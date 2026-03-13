"use client";

import { useSession, signOut } from "next-auth/react";

// 헤더에 표시되는 인증 상태 및 로그아웃 버튼
export default function AuthStatus() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 hidden sm:block">
        {session.user?.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/signin" })}
        className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 transition-colors"
      >
        로그아웃
      </button>
    </div>
  );
}
