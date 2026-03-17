import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { put } from "@vercel/blob";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const chunk = formData.get("chunk") as File;
    const uploadId = formData.get("uploadId") as string;
    const partNumber = formData.get("partNumber") as string;

    if (!chunk || !uploadId || !partNumber) {
      return NextResponse.json({ error: "필수 파라미터가 없습니다" }, { status: 400 });
    }

    const blob = await put(`chunks/${uploadId}/${partNumber}`, chunk, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({ chunkUrl: blob.url });
  } catch (error) {
    console.error("청크 업로드 오류:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
