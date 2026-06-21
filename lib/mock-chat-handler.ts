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

const FALLBACK_RESPONSES = [
  "かしこまりました。お茶の世界は奥深いですよ。何でも聞いてください。",
  "なるほど。それについて詳しくお話ししましょう。",
  "良い質問ですね。お茶を一服しながら、ゆっくり考えてみましょう。",
];

function pickResponse(
  lastContent: string,
  salesRules: SalesRule[],
  products: ShopifyProduct[]
): string {
  const text = lastContent?.toLowerCase() ?? "";

  if (text.includes("クイズ")) {
    return "お茶クイズいきましょう！問題です。日本の緑茶の中でカフェインが最も多いお茶は何でしょう？①煎茶　②玉露　③ほうじ茶";
  }

  // 営業ルールのキーワードマッチ（優先度順に評価済み）
  for (const rule of salesRules) {
    const keywords = rule.keywords.split(",").map((k) => k.trim());
    const matched = keywords.some((kw) => text.includes(kw));
    if (matched) {
      // マッチした商品のURLを商品DBから引く
      const product = products.find(
        (p) => p.name.includes(rule.recommendProduct.split("(")[0].trim()) || rule.recommendProduct.includes(p.name.split("（")[0].trim())
      );
      const urlPart = product ? `\n\n詳しくはこちら → ${product.shopifyUrl}` : "";
      return `${rule.recommendMessage}\n\nそんなときは「${rule.recommendProduct}」がおすすめです。${urlPart}`;
    }
  }

  if (text.includes("煎茶") || text.includes("淹れ方") || text.includes("バリエーション")) {
    return "煎茶の楽しみ方はたくさんあります。低温でじっくり旨味を引き出す「玉露風」、水出しでスッキリ、ミルクで割る「抹茶ラテ風」など。水温次第で全く別のお茶になりますよ。";
  }

  // 商品紹介（セール中のものがあれば案内）
  const onSale = products.filter((p) => p.onSale && p.enabled);
  if (onSale.length > 0 && (text.includes("おすすめ") || text.includes("何がある"))) {
    const p = onSale[0];
    const priceStr = p.salePrice ? `¥${p.salePrice.toLocaleString()}（セール中）` : `¥${p.price.toLocaleString()}`;
    return `今おすすめは「${p.name}」です。${p.description} ${priceStr}\n\n${p.shopifyUrl}`;
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
