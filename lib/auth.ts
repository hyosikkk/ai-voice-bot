import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { ensureDb, isEmailWhitelisted } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    // 로그인 시 화이트리스트 확인
    async signIn({ user }) {
      if (!user.email) return false;

      try {
        // 테이블이 없으면 생성하고 초기 데이터 삽입
        await ensureDb();
        const allowed = await isEmailWhitelisted(user.email);
        console.log(`[로그인] ${user.email} (${user.name}) - ${allowed ? "허용" : "거부"} - ${new Date().toISOString()}`);
        return allowed;
      } catch (error) {
        console.error("화이트리스트 확인 오류:", error);
        return false;
      }
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/signin",
    // 화이트리스트에 없는 경우 AccessDenied 에러로 이 페이지로 리다이렉트
    error: "/access-denied",
  },
};
