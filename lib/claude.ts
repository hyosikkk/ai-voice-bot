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
