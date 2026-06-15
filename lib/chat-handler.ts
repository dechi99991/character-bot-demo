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
    const [topics, salesRules] = await Promise.all([
      dataStore.listActiveTopics(),
      dataStore.listActiveSalesRules(),
    ]);
    return { topics, salesRules };
  } catch {
    // DB障害でチャットが落ちないようフォールバック
    return { topics: [], salesRules: [] };
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
  const system = buildCharacterSetting(context);

  // 3. LLM 呼び出し + ストリーミング
  const result = streamText({
    model: google(CHAT_MODEL),
    system,
    messages: input.messages,
  });

  return result.toDataStreamResponse();
}
