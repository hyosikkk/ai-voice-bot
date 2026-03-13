import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { transcribeAudio } from "@/lib/elevenlabs";
import { translateText } from "@/lib/claude";
import { synthesizeSpeech } from "@/lib/elevenlabs";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const targetLanguage = formData.get("targetLanguage") as string;
    const fileName = formData.get("fileName") as string;

    if (!file || !targetLanguage) {
      return NextResponse.json(
        { error: "file과 targetLanguage는 필수입니다" },
        { status: 400 }
      );
    }

    const supportedLanguages = ["ko", "en", "ja", "es"];
    if (!supportedLanguages.includes(targetLanguage)) {
      return NextResponse.json(
        { error: "지원하지 않는 언어입니다" },
        { status: 400 }
      );
    }

    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);
    const fileMimeType = file.type || "audio/mpeg";

    console.log("1단계: 음성 인식(STT) 처리 중...");
    const transcription = await transcribeAudio(fileBuffer, fileMimeType);
    if (!transcription.trim()) {
      throw new Error("음성에서 텍스트를 인식할 수 없습니다");
    }

    console.log("2단계: Claude로 번역 중... 목표 언어:", targetLanguage);
    const translatedText = await translateText(transcription, targetLanguage);

    console.log("3단계: 음성 합성(TTS) 처리 중...");
    const audioBuffer = await synthesizeSpeech(translatedText);

    const originalName = (fileName || file.name).replace(/\.[^/.]+$/, "") || "dubbed";
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
  }
}
