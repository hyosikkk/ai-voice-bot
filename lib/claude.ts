// Google Cloud Translation API v2 (Basic)
// Free tier: 500,000 characters/month
// API 키: https://console.cloud.google.com/apis/library/translate.googleapis.com

export async function translateText(
  text: string,
  targetLanguage: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_TRANSLATE_API_KEY가 설정되지 않았습니다");

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        target: targetLanguage,
        format: "text",
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Translate 오류 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.data.translations[0].translatedText as string;
}

// 여러 텍스트를 한 번에 번역 (Google Translate 배치 요청)
export async function translateSegments(
  texts: string[],
  targetLanguage: string
): Promise<string[]> {
  if (texts.length === 0) return [];
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_TRANSLATE_API_KEY가 설정되지 않았습니다");

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: texts,
        target: targetLanguage,
        format: "text",
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Translate 오류 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.data.translations.map((t: any) => t.translatedText as string);
}
