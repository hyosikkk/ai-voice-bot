"use client";

import { useSession, signOut } from "next-auth/react";

export default function AuthStatus() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:block text-xs text-slate-500 max-w-[160px] truncate">
        {session.user?.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/signin" })}
        className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5"
      >
        로그아웃
      </button>
    </div>
  );
}
