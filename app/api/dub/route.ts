import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { transcribeAudio } from "@/lib/elevenlabs";
import { translateText } from "@/lib/claude";
import { synthesizeSpeech } from "@/lib/elevenlabs";
import { del } from "@vercel/blob";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  let blobUrl: string | null = null;

  try {
    const body = await request.json();
    blobUrl = body.blobUrl as string;
    const targetLanguage = body.targetLanguage as string;
    const fileName = body.fileName as string;

    if (!blobUrl || !targetLanguage) {
      return NextResponse.json(
        { error: "blobUrl과 targetLanguage는 필수입니다" },
        { status: 400 }
      );
    }

    const supportedLanguages = ["ko", "en", "ja", "es"];
    if (!supportedLanguages.includes(targetLanguage)) {
      return NextResponse.json({ error: "지원하지 않는 언어입니다" }, { status: 400 });
    }

    // Vercel Blob에서 파일 다운로드
    const fileResponse = await fetch(blobUrl);
    if (!fileResponse.ok) throw new Error("파일을 불러오지 못했습니다");

    const mimeType = fileResponse.headers.get("content-type") || "audio/mpeg";
    const fileArrayBuffer = await fileResponse.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);

    console.log("1단계: 음성 인식(STT) 처리 중...");
    const transcription = await transcribeAudio(fileBuffer, mimeType);
    if (!transcription.trim()) {
      throw new Error("음성에서 텍스트를 인식할 수 없습니다");
    }

    console.log("2단계: 번역 중... 목표 언어:", targetLanguage);
    const translatedText = await translateText(transcription, targetLanguage);

    console.log("3단계: 음성 합성(TTS) 처리 중...");
    const audioBuffer = await synthesizeSpeech(translatedText);

    const originalName = (fileName || "dubbed").replace(/\.[^/.]+$/, "");
    const outputFileName = `dubbed_${originalName}_${targetLanguage}.mp3`;
    const audioBase64 = `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      transcription,
      translatedText,
      audioUrl: audioBase64,
      fileName: outputFileName,
    });
  } catch (error) {
    console.error("더빙 파이프라인 오류:", error);
    return NextResponse.json(
      { error: (error as Error).message || "더빙 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  } finally {
    // 처리 완료 후 Blob 삭제 (스토리지 절약)
    if (blobUrl) {
      await del(blobUrl).catch(() => {});
    }
  }
}
