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

/** 商品属性ベースで最適な商品を1件選ぶ（MOCK_CHAT用の簡易レコメンダー） */
function pickProductByAttributes(
  text: string,
  products: ShopifyProduct[]
): ShopifyProduct | null {
  const available = products.filter((p) => p.enabled);

  // ① ハードガードレール: カフェイン制限
  const wantsLowCaffeine =
    /カフェイン控|カフェイン少|夜遅|夜だし|眠れ|寝れ|寝付|カフェイン低/.test(text);
  const wantsZeroCaffeine = /カフェインゼロ|カフェインなし|デカフェ/.test(text);

  let candidates = available;
  if (wantsZeroCaffeine) {
    candidates = candidates.filter((p) => p.caffeineLevel === "ゼロ");
  } else if (wantsLowCaffeine) {
    candidates = candidates.filter((p) =>
      ["低", "ゼロ"].includes(p.caffeineLevel)
    );
  }
  if (candidates.length === 0) candidates = available; // フォールバック

  // ② 初心者/セット優先
  const wantsBeginner =
    /初心者|はじめて|何から|迷って|わからない|プレゼント|ギフト|贈り/.test(text);
  if (wantsBeginner) {
    const sets = candidates.filter((p) => p.isSet);
    if (sets.length > 0) return sets[0];
  }

  // ③ シーン・気分スコアリング
  const sceneMap: Record<string, string[]> = {
    朝: ["朝", "起き"],
    "仕事の合間": ["集中", "仕事", "作業", "勉強"],
    夜: ["夜", "就寝", "寝る前"],
    食後: ["食後", "ご飯のあと", "食事のあと"],
    来客: ["来客", "お客様", "おもてなし", "来てる"],
  };
  const moodMap: Record<string, string[]> = {
    シャキッと: ["シャキッ", "スッキリ", "すっきり", "覚醒", "頭"],
    落ち着き: ["落ち着き", "リラックス", "ほっと", "ゆっくり"],
    甘い癒し: ["甘い", "甘め", "甘さ", "渋みが苦手", "苦いの苦手"],
    特別な時間: ["特別", "大切", "おもてなし", "記念"],
  };

  const scored = candidates.map((p) => {
    let score = 0;
    for (const [scene, kws] of Object.entries(sceneMap)) {
      if (kws.some((kw) => text.includes(kw)) && p.scenes.includes(scene))
        score += 2;
    }
    for (const [mood, kws] of Object.entries(moodMap)) {
      if (kws.some((kw) => text.includes(kw)) && p.moods.includes(mood))
        score += 2;
    }
    if (p.featured) score += 1;
    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return best && best.score > 0 ? best.p : null;
}

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

  // 営業ルールのキーワードマッチ（優先度順・最優先）
  for (const rule of salesRules) {
    const keywords = rule.keywords.split(",").map((k) => k.trim());
    const matched = keywords.some((kw) => text.includes(kw));
    if (matched) {
      const product = products.find((p) => p.name === rule.recommendProduct);
      const urlPart = product ? `\n\n詳しくはこちら → ${product.shopifyUrl}` : "";
      return `${rule.recommendMessage}\n\nそんなときは「${rule.recommendProduct}」がおすすめです。${urlPart}`;
    }
  }

  // 商品属性ベースのレコメンド
  const matched = pickProductByAttributes(text, products);
  if (matched) {
    const reason = "シーンや気分から選ぶなら、";
    return formatProductReply(matched, reason);
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
