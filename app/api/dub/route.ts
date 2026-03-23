import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { transcribeAudio, createSubtitleSegments, computeSyncMap, SUPPORTED_LANGUAGES } from "@/lib/elevenlabs";
import { translateSegments } from "@/lib/claude";
import { synthesizeSpeech } from "@/lib/elevenlabs";
import { del } from "@vercel/blob";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  let chunkUrls: string[] = [];

  try {
    const body = await request.json();
    chunkUrls = body.chunkUrls as string[];
    const targetLanguage = body.targetLanguage as string;
    const fileName = body.fileName as string;
    const mimeType = (body.mimeType as string) || "audio/mpeg";

    if (!chunkUrls?.length || !targetLanguage) {
      return NextResponse.json(
        { error: "chunkUrls와 targetLanguage는 필수입니다" },
        { status: 400 }
      );
    }

    const supportedLanguages: string[] = SUPPORTED_LANGUAGES.map((l) => l.code);
    if (!supportedLanguages.includes(targetLanguage)) {
      return NextResponse.json({ error: "지원하지 않는 언어입니다" }, { status: 400 });
    }

    // 청크 다운로드 및 조합
    console.log(`청크 조합 중... (${chunkUrls.length}개)`);
    const chunkBuffers = await Promise.all(
      chunkUrls.map(async (url) => {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
        });
        if (!res.ok) throw new Error("청크 다운로드 실패");
        return Buffer.from(await res.arrayBuffer());
      })
    );
    const fileBuffer = Buffer.concat(chunkBuffers);

    console.log("1단계: 음성 인식(STT) 처리 중...");
    const { text: transcription, words } = await transcribeAudio(fileBuffer, mimeType);
    if (!transcription.trim()) {
      throw new Error("음성에서 텍스트를 인식할 수 없습니다");
    }

    // 단어 타임스탬프로 자막 세그먼트 생성
    const originalSegments = createSubtitleSegments(words);

    console.log("2단계: 번역 중... 목표 언어:", targetLanguage);
    // 세그먼트별 번역 (자막 + TTS 입력 통합)
    const translatedSegmentTexts = originalSegments.length > 0
      ? await translateSegments(originalSegments.map((s) => s.text), targetLanguage)
      : [await (await import("@/lib/claude")).translateText(transcription, targetLanguage)];

    // 세그먼트 번역을 이어붙여 TTS 입력으로 사용 (자막과 일관성 유지)
    const translatedText = translatedSegmentTexts.join(" ");

    // 원본 타임스탬프 + 번역 텍스트 조합 (자막용)
    const subtitles = originalSegments.map((seg, i) => ({
      start: seg.start,
      end: seg.end,
      original: seg.text,
      translated: translatedSegmentTexts[i] ?? "",
    }));

    console.log("3단계: 음성 합성(TTS) 처리 중...");
    const { audio: audioBuffer, alignment } = await synthesizeSpeech(translatedText);

    // 세그먼트별 더빙 타임라인 계산
    const syncMap = originalSegments.length > 0
      ? computeSyncMap(translatedSegmentTexts, originalSegments, alignment)
      : [];

    const originalName = (fileName || "dubbed").replace(/\.[^/.]+$/, "");
    const outputFileName = `dubbed_${originalName}_${targetLanguage}.mp3`;
    const audioBase64 = `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      transcription,
      translatedText,
      audioUrl: audioBase64,
      fileName: outputFileName,
      subtitles,
      syncMap,
    });
  } catch (error) {
    console.error("더빙 파이프라인 오류:", error);
    return NextResponse.json(
      { error: (error as Error).message || "더빙 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  } finally {
    // 청크 삭제
    if (chunkUrls.length > 0) {
      await Promise.all(chunkUrls.map((url) => del(url).catch(() => {})));
    }
  }
}
