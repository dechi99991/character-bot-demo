/**
 * モックチャットハンドラー
 *
 * MOCK_CHAT=true のとき Gemini を呼ばずにこちらが応答する。
 * useChat（フロント）と互換の Vercel AI SDK データストリーム形式で返す。
 */

import type { CoreMessage } from "ai";

const FALLBACK_RESPONSES = [
  "かしこまりました。お茶の世界は奥深いですよ。何でも聞いてください。",
  "なるほど。それについて詳しくお話ししましょう。",
  "良い質問ですね。お茶を一服しながら、ゆっくり考えてみましょう。",
];

function pickResponse(lastContent: string): string {
  const text = lastContent?.toLowerCase() ?? "";

  if (text.includes("クイズ")) {
    return "お茶クイズいきましょう！問題です。日本の緑茶の中でカフェインが最も多いお茶は何でしょう？①煎茶　②玉露　③ほうじ茶";
  }
  if (text.includes("睡眠") || text.includes("寝") || text.includes("夜")) {
    return "夜には「ほうじ茶」がオススメです。焙煎でカフェインが減り、香ばしい香りがリラックスを誘ってくれますよ。";
  }
  if (text.includes("煎茶") || text.includes("淹れ方") || text.includes("バリエーション")) {
    return "煎茶の楽しみ方はたくさんあります。低温でじっくり旨味を引き出す「玉露風」、水出しでスッキリ、ミルクで割る「抹茶ラテ風」など。水温次第で全く別のお茶になりますよ。";
  }

  // キーワード非該当はローテーション
  const idx = Math.floor(Date.now() / 1000) % FALLBACK_RESPONSES.length;
  return FALLBACK_RESPONSES[idx];
}

export async function mockChat({
  messages,
}: {
  messages: CoreMessage[];
}): Promise<Response> {
  const last = messages[messages.length - 1];
  const content = typeof last?.content === "string" ? last.content : "";
  const text = pickResponse(content);

  const encoder = new TextEncoder();

  // Vercel AI SDK データストリーム形式（v1）で1文字ずつストリーミング
  const stream = new ReadableStream({
    async start(controller) {
      for (const char of text) {
        controller.enqueue(encoder.encode(`0:${JSON.stringify(char)}\n`));
        await new Promise((r) => setTimeout(r, 25));
      }
      controller.enqueue(
        encoder.encode(
          `d:${JSON.stringify({
            finishReason: "stop",
            usage: { promptTokens: 0, completionTokens: text.length },
          })}\n`
        )
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-vercel-ai-data-stream": "v1",
    },
  });
}
