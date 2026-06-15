/**
 * 動的コンテキストビルダー
 *
 * 【Why】
 * 会話フローは3段階（雑談 / 営業 / キャラクター横断）。
 * このうち雑談モードの①話題DBと営業モードの②営業ルールDBは
 * 「実行時に変わるデータ」であり、システムプロンプトに動的注入する必要がある。
 * その注入文字列の組み立て責務をここに集約する（character.ts は静的設定のみ）。
 *
 * 【函（処理ブロック）】
 *   入力: Topic[]（①） + SalesRule[]（②）
 *   出力: システムプロンプト末尾に追記する文字列（buildDynamicSection）
 *
 * 現状はDBがスタブのため空配列が来る → 空文字を返し、
 * buildCharacterSetting 側で既存プロンプトに何も足さない（＝現行動作を維持）。
 */

import type { Topic, SalesRule } from "@/lib/db";

// 型を1箇所から参照できるよう再エクスポート
export type { Topic, SalesRule } from "@/lib/db";

/**
 * chat-handler / character.ts に渡す動的コンテキスト。
 * 将来フィールドが増えてもここに足せば波及範囲が限定される。
 */
export interface CharacterContext {
  /** ① 話題DB由来の補強情報（雑談モード用） */
  topics: Topic[];
  /** ② 営業ルールDB由来のレコメンド候補（営業モード用） */
  salesRules: SalesRule[];
}

/** 空の CharacterContext（DB未接続時・テスト時の既定） */
export const EMPTY_CONTEXT: CharacterContext = {
  topics: [],
  salesRules: [],
};

/**
 * ① 話題DBから、プロンプト注入用の「今の話題」セクションを生成。
 * 空なら空文字を返す（既存プロンプトを汚さない）。
 */
function buildTopicsSection(topics: Topic[]): string {
  const active = topics.filter((t) => t.enabled);
  if (active.length === 0) return "";

  const lines = active.map((t) => `- ${t.title}: ${t.body}`).join("\n");
  return [
    "【最近の話題（雑談のフックに使ってよい。無理に全部使わなくてよい）】",
    lines,
  ].join("\n");
}

/**
 * ② 営業ルールDBから、レコメンド指針セクションを生成。
 * キーワードにマッチしたらこの商品をこのトークで自然に勧める、という参照表。
 * 実際のマッチ判定はLLMに委ねる（プロンプト内の指示として渡す）。
 */
function buildSalesRulesSection(salesRules: SalesRule[]): string {
  const active = salesRules
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);
  if (active.length === 0) return "";

  const lines = active
    .map(
      (r) =>
        `- もしユーザーの発言に [${r.keywords}] のいずれかが関係していたら、` +
        `「${r.recommendProduct}」を次の趣旨で自然に勧める: ${r.recommendMessage}`
    )
    .join("\n");
  return [
    "【営業レコメンド指針（押し売りはせず、会話の流れに合うときだけ使う）】",
    lines,
  ].join("\n");
}

/**
 * CharacterContext から、システムプロンプト末尾に追記する文字列を生成。
 * 注入すべきものが何もなければ空文字を返す。
 */
export function buildDynamicSection(context: CharacterContext): string {
  const sections = [
    buildTopicsSection(context.topics),
    buildSalesRulesSection(context.salesRules),
  ].filter((s) => s.length > 0);

  if (sections.length === 0) return "";

  return [
    "",
    "# ============================================================",
    "# 動的コンテキスト（管理画面DB由来。運用で随時更新される）",
    "# ============================================================",
    "",
    sections.join("\n\n"),
  ].join("\n");
}
