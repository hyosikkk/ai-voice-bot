import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DubbingForm from "@/components/DubbingForm";

// 메인 더빙 페이지 (서버 컴포넌트)
export default async function Home() {
  const session = await getServerSession(authOptions);

  // 미들웨어에서 이미 처리하지만, 이중 보호
  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* 페이지 제목 */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">AI 더빙 서비스</h1>
        <p className="text-gray-500 text-base">
          오디오 또는 비디오 파일을 업로드하면 AI가 자동으로 원하는 언어로 더빙합니다
        </p>
        <div className="mt-4 flex justify-center gap-2 flex-wrap">
          {["ElevenLabs STT", "Claude 번역", "ElevenLabs TTS"].map((step, i) => (
            <span key={step} className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              <span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                {i + 1}
              </span>
              {step}
            </span>
          ))}
        </div>
      </div>

      {/* 더빙 폼 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <DubbingForm />
      </div>

      {/* 지원 형식 안내 */}
      <div className="mt-6 text-center text-xs text-gray-400">
        지원 언어: 한국어 · English · 日本語 · Español
      </div>
    </div>
  );
}
