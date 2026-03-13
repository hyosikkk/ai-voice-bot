"use client";

import { SessionProvider } from "next-auth/react";

// NextAuth 세션 프로바이더 래퍼 (클라이언트 컴포넌트)
export default function NextAuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
