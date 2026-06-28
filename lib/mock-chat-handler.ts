/**
 * モックチャットハンドラー
 *
 * MOCK_CHAT=true のとき Gemini を呼ばずにこちらが応答する。
 * useChat（フロント）と互換の Vercel AI SDK データストリーム形式で返す。
 * DB（InMemoryDataStore）から営業ルール・商品情報を取得してレスポンスに反映する。
 */

import type { CoreMessage } from "ai";
import { getDataStore } from "@/lib/db";
import type { SalesRule, ShopifyProduct } from "@/lib/db";
import { recommend } from "@/lib/recommend";

const FALLBACK_RESPONSES = [
  "かしこまりました。お茶の世界は奥深いですよ。何でも聞いてください。",
  "なるほど。それについて詳しくお話ししましょう。",
  "良い質問ですね。お茶を一服しながら、ゆっくり考えてみましょう。",
];

/** 商品1件を自然な返答テキストにフォーマット */
function formatProductReply(p: ShopifyProduct, reason: string): string {
  const priceStr =
    p.onSale && p.salePrice
      ? `¥${p.salePrice.toLocaleString()}（セール中）`
      : `¥${p.price.toLocaleString()}`;
  return [
    reason,
    `「${p.name}」がおすすめです。`,
    p.story,
    `${priceStr} → ${p.shopifyUrl}`,
  ].join("\n\n");
}

function pickResponse(
  lastContent: string,
  salesRules: SalesRule[],
  products: ShopifyProduct[]
): string {
  const text = lastContent ?? "";

  if (text.includes("クイズ")) {
    return "お茶クイズいきましょう！問題です。日本の緑茶の中でカフェインが最も多いお茶は何でしょう？①煎茶　②玉露　③ほうじ茶";
  }

  if (text.includes("煎茶") && (text.includes("淹れ方") || text.includes("バリエーション"))) {
    return "煎茶の楽しみ方はたくさんあります。低温でじっくり旨味を引き出す「玉露風」、水出しでスッキリ、水出しで甘みを引き出すなど。水温次第で全く別のお茶になりますよ。";
  }

  // レコメンド判断は単一の真実 recommend() に委譲（real LLM 経路と同一ロジック）
  const result = recommend(text, products, salesRules);
  if (result) {
    return formatProductReply(result.product, result.reason);
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

  // DBから営業ルール・商品情報を取得（失敗時は空配列でフォールバック）
  let salesRules: SalesRule[] = [];
  let products: ShopifyProduct[] = [];
  try {
    const store = getDataStore();
    [salesRules, products] = await Promise.all([
      store.listActiveSalesRules(),
      store.listFeaturedProducts(),
    ]);
  } catch {
    // no-op: フォールバックレスポンスを使う
  }

  const text = pickResponse(content, salesRules, products);

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
