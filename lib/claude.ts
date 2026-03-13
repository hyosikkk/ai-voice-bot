import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 언어 코드를 사람이 읽기 쉬운 이름으로 변환
const LANGUAGE_NAMES: Record<string, string> = {
  ko: "한국어",
  en: "영어(English)",
  ja: "일본어(日本語)",
  es: "스페인어(Español)",
};

// 텍스트를 목표 언어로 번역
export async function translateText(
  text: string,
  targetLanguage: string
): Promise<string> {
  const targetName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `다음 텍스트를 ${targetName}로 번역해주세요. 더빙용 번역이므로 자연스럽고 구어체로 번역해주세요. 번역문만 출력하고 설명이나 다른 텍스트는 포함하지 마세요.

번역할 텍스트:
${text}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Claude API에서 예상치 못한 응답 형식");
  }

  return content.text.trim();
}
