import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Vercel Blob 클라이언트 업로드 핸들러
// 이 방식으로 4.5MB Vercel 요청 제한을 우회하여 대용량 파일 업로드 가능
export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          // 허용할 오디오/비디오 MIME 타입
          allowedContentTypes: [
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/wave",
            "audio/x-wav",
            "audio/mp4",
            "audio/ogg",
            "audio/webm",
            "video/mp4",
            "video/webm",
            "video/quicktime",
          ],
          // 최대 파일 크기: 100MB
          maximumSizeInBytes: 100 * 1024 * 1024,
          tokenPayload: JSON.stringify({ email: session.user?.email }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("파일 업로드 완료:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
