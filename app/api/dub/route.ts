import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { transcribeAudio } from "@/lib/elevenlabs";
import { translateText } from "@/lib/claude";
import { synthesizeSpeech } from "@/lib/elevenlabs";

// Vercel Pro 플랜에서는 최대 300초까지 허용
// 더빙 파이프라인(STT + 번역 + TTS)이 시간이 걸릴 수 있음
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  // 인증 확인
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fileUrl, fileName, mimeType, targetLanguage } = body;

    if (!fileUrl || !targetLanguage) {
      return NextResponse.json(
        { error: "fileUrl과 targetLanguage는 필수입니다" },
        { status: 400 }
      );
    }

    // 지원 언어 확인
    const supportedLanguages = ["ko", "en", "ja", "es"];
    if (!supportedLanguages.includes(targetLanguage)) {
      return NextResponse.json(
        { error: "지원하지 않는 언어입니다" },
        { status: 400 }
      );
    }

    // 1단계: Vercel Blob에서 파일 다운로드
    console.log("1단계: 파일 다운로드 중...", fileUrl);
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error("파일 다운로드 실패");
    }
    const fileArrayBuffer = await fileResponse.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);
    const fileMimeType = mimeType || fileResponse.headers.get("content-type") || "audio/mpeg";

    // 2단계: ElevenLabs STT로 음성 → 텍스트 변환
    console.log("2단계: 음성 인식(STT) 처리 중...");
    const transcription = await transcribeAudio(fileBuffer, fileMimeType);
    if (!transcription.trim()) {
      throw new Error("음성에서 텍스트를 인식할 수 없습니다");
    }
    console.log("STT 완료, 텍스트 길이:", transcription.length);

    // 3단계: Claude API로 번역
    console.log("3단계: Claude로 번역 중... 목표 언어:", targetLanguage);
    const translatedText = await translateText(transcription, targetLanguage);
    console.log("번역 완료, 번역 텍스트 길이:", translatedText.length);

    // 4단계: ElevenLabs TTS로 텍스트 → 음성 변환
    console.log("4단계: 음성 합성(TTS) 처리 중...");
    const audioBuffer = await synthesizeSpeech(translatedText);

    // 5단계: 생성된 더빙 오디오를 Vercel Blob에 업로드
    console.log("5단계: 결과물 업로드 중...");
    const originalName = fileName?.replace(/\.[^/.]+$/, "") || "dubbed";
    const outputFileName = `dubbed_${originalName}_${targetLanguage}_${Date.now()}.mp3`;
    const blob = await put(outputFileName, audioBuffer, {
      access: "public",
      contentType: "audio/mpeg",
    });

    return NextResponse.json({
      success: true,
      transcription,
      translatedText,
      audioUrl: blob.url,
      fileName: outputFileName,
    });
  } catch (error) {
    console.error("더빙 파이프라인 오류:", error);
    return NextResponse.json(
      { error: (error as Error).message || "더빙 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
