import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// 클라이언트 사이드 업로드 토큰 발급 핸들러
export async function POST(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave",
          "audio/x-wav", "audio/mp4", "audio/ogg", "audio/webm",
          "video/mp4", "video/webm", "video/quicktime",
        ],
        maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
