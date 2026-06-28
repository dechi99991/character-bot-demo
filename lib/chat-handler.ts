/**
 * チャットのコアロジック（フレームワーク非依存）
 *
 * 【Why】
 * Next.js API Route と Cloudflare Workers のどちらからも同じロジックを
 * 呼べるようにする。Next.js 固有API（NextRequest 等）には依存せず、
 * 標準の Request/Response と Vercel AI SDK のみに依存する。
 * これにより Workers 移行時は route.ts（薄いアダプター）だけ書き直せば済む。
 *
 * 【函（処理ブロック）】
 *   1. DB①②から動的コンテキストを取得（ChatDataStore 経由・現状スタブ）
 *   2. buildCharacterSetting でシステムプロンプトを合成
 *   3. streamText で Gemini を呼び、ストリーミングレスポンスを返す
 *
 * ストリーミングは toDataStreamResponse() を使用。
 * これは Vercel AI SDK の useChat（フロント）と互換のワイヤフォーマット。
 * フロントを別実装（寺園さん）にする場合もこの形式を維持すること。
 */

import { streamText, type CoreMessage } from "ai";
import { google } from "@ai-sdk/google";
import { buildCharacterSetting } from "@/lib/character";
import { type CharacterContext } from "@/lib/context-builder";
import { getDataStore, type ChatDataStore } from "@/lib/db";
import { recommend } from "@/lib/recommend";

/**
 * messages から最新のユーザー発言テキストを取り出す。
 * content は string か Part[]（マルチモーダル）の両形式があるため両対応。
 */
function extractLastUserText(messages: CoreMessage[]): string {
  const content = messages.filter((m) => m.role === "user").at(-1)?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  }
  return "";
}

/**
 * サーバー側で確定したレコメンド結果を、システムプロンプト末尾に
 * 「最優先の確定指示」として注入する文字列を生成する。
 *
 * 【Why — LLM にガードレールを実行させない】
 * 「①〜④を自分で適用して選べ」と LLM に委ねると、ポジティブ表現
 * （「甘い」「渋みのない」）を好み指定と認識せずフォールバックする事故が起きる。
 * そこで「どの商品を出すか」は recommend() で決定的に確定し、
 * LLM には「この商品を口調に乗せて紹介する」役割だけを残す。
 * これにより商品選択は real/mock/test で同一保証される。
 */
function buildRecommendDirective(productName: string, url: string, reason: string): string {
  return [
    "",
    "# ============================================================",
    "# レコメンド確定（サーバー側で決定済み・このセクションが最優先）",
    "# ============================================================",
    `# このターンで提案すべき商品は「${productName}」に確定している。`,
    "# 他の商品を主役にしないこと。「シーンや気分から選ぶなら〜」と言って",
    "# 別商品（例: 茶のことはじめ）にすり替えるのは誤り。",
    `# チャ・レノンの口調で、この商品だけを自然に1点提案すること。`,
    `# 提案理由の方向性: ${reason}`,
    `# 案内する商品URL: ${url}`,
  ].join("\n");
}

/** 使用する LLM モデルID（1箇所に集約） */
export const CHAT_MODEL = "gemini-2.5-pro";

/** handleChat の入力 */
export interface ChatHandlerInput {
  /** 会話履歴（Vercel AI SDK の CoreMessage 形式） */
  messages: CoreMessage[];
  /**
   * データストア。省略時は既定（現状スタブ）。
   * Workers では env.DB から生成した D1 実装を注入する。
   */
  dataStore?: ChatDataStore;
}

/**
 * ① 話題DB・② 営業ルールDB から動的コンテキストを構築する。
 * 取得失敗時も会話本体は止めず、空コンテキストにフォールバックする。
 */
async function loadCharacterContext(
  dataStore: ChatDataStore
): Promise<CharacterContext> {
  try {
    const [topics, salesRules, products] = await Promise.all([
      dataStore.listActiveTopics(),
      dataStore.listActiveSalesRules(),
      dataStore.listFeaturedProducts(),
    ]);
    return { topics, salesRules, products };
  } catch {
    // DB障害でチャットが落ちないようフォールバック
    return { topics: [], salesRules: [], products: [] };
  }
}

/**
 * チャットのコア処理。ストリーミング Response を返す。
 *
 * @returns Vercel AI SDK 互換のデータストリーミング Response（標準 Response 型）
 */
export async function handleChat(input: ChatHandlerInput): Promise<Response> {
  const dataStore = input.dataStore ?? getDataStore();

  // 1. DB①② → 動的コンテキスト
  const context = await loadCharacterContext(dataStore);

  // 2. システムプロンプト合成（ベース不変 + 動的セクション）
  const baseSystem = buildCharacterSetting(context);

  // 2-b. レコメンドをサーバー側で決定的に確定し、確定指示を注入する。
  //      LLM にガードレール①〜④を委ねず「出す商品」を固定する（口調のみ LLM 担当）。
  const lastUserText = extractLastUserText(input.messages);
  const recommendation = recommend(
    lastUserText,
    context.products,
    context.salesRules
  );

  const system = recommendation
    ? baseSystem +
      "\n" +
      buildRecommendDirective(
        recommendation.product.name,
        recommendation.product.shopifyUrl,
        recommendation.reason
      )
    : baseSystem;

  // 3. LLM 呼び出し + ストリーミング
  const result = streamText({
    model: google(CHAT_MODEL),
    system,
    messages: input.messages,
  });

  return result.toDataStreamResponse();
}
