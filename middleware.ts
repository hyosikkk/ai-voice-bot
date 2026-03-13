export { default } from "next-auth/middleware";

export const config = {
  // 로그인 페이지, 접근 거부 페이지, API 인증 라우트, 정적 파일은 미들웨어 제외
  matcher: ["/((?!signin|access-denied|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
