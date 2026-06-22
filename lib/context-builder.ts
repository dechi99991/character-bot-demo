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

import type { Topic, SalesRule, ShopifyProduct } from "@/lib/db";

// 型を1箇所から参照できるよう再エクスポート
export type { Topic, SalesRule, ShopifyProduct } from "@/lib/db";

/**
 * chat-handler / character.ts に渡す動的コンテキスト。
 * 将来フィールドが増えてもここに足せば波及範囲が限定される。
 */
export interface CharacterContext {
  /** ① 話題DB由来の補強情報（雑談モード用） */
  topics: Topic[];
  /** ② 営業ルールDB由来のレコメンド候補（営業モード用） */
  salesRules: SalesRule[];
  /** ③ Shopify 紹介商品（featured & enabled なもの） */
  products: ShopifyProduct[];
}

/** 空の CharacterContext（DB未接続時・テスト時の既定） */
export const EMPTY_CONTEXT: CharacterContext = {
  topics: [],
  salesRules: [],
  products: [],
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
    "【特別・キャンペーン用レコメンド指針（特定キーワード時の補助。下記の商品カタログが主、こちらは従）】",
    "※ 通常の提案は商品カタログのシーン・気分マッチを優先する。以下は特売や特定文脈での補強として扱う。",
    lines,
  ].join("\n");
}

/**
 * ③ Shopify 商品DBから、属性リッチな商品カタログセクションを生成。
 *
 * 【Why】
 * レコメンド制御（ハードガードレール／ソフト推薦）を LLM が適用するには、
 * カフェイン・味プロファイル・シーン・気分など全属性をプロンプトに露出する必要がある。
 * 各商品を「カード」形式で整形し、LLM が機械的フィルタ→シーン/気分マッチの順で
 * 1〜2点を選べる状態を作る。
 */
function buildProductsSection(products: ShopifyProduct[]): string {
  if (products.length === 0) return "";

  const cards = products
    .map((p) => {
      const priceStr =
        p.onSale && p.salePrice
          ? `¥${p.salePrice.toLocaleString()}（定価 ¥${p.price.toLocaleString()}・セール中）`
          : `¥${p.price.toLocaleString()}`;

      const t = p.tasteProfile;
      const lines: string[] = [];
      lines.push(`【${p.name}】(${p.category})`);
      lines.push(`  ストーリー: ${p.story}`);
      lines.push(
        `  カフェイン: ${p.caffeineLevel} | 淹れやすさ: ${p.brewingDifficulty}`
      );
      lines.push(
        `  味プロファイル: 旨味=${t.umami} 渋味=${t.astringency} 苦味=${t.bitterness} 甘味=${t.sweetness} 香ばしさ=${t.roastiness}`
      );
      lines.push(`  合うシーン: ${p.scenes.join("・")}`);
      lines.push(`  気分・役割: ${p.moods.join("・")}`);
      lines.push(`  飲み方: ${p.brewingMethods.join("・")}`);
      lines.push(`  用途: ${p.purposes.join("・")}`);
      if (p.isSet) {
        lines.push("  ※ 詰め合わせセット（ビギナー第一候補）");
      }
      // 産地・品種・製法は揃っているものだけ露出（フックとして会話に溶かす）
      const specParts: string[] = [];
      if (p.origin) specParts.push(`産地: ${p.origin}`);
      if (p.cultivar) specParts.push(`品種: ${p.cultivar}`);
      if (p.processing) specParts.push(`製法: ${p.processing}`);
      if (specParts.length > 0) {
        lines.push(`  ${specParts.join(" / ")}`);
      }
      lines.push(`  価格: ${priceStr} → ${p.shopifyUrl}`);
      return lines.join("\n");
    })
    .join("\n\n");

  return [
    "【紹介できる商品カタログ（ハードガードレール通過後、シーン・気分に最も寄り添う1〜2点を選ぶ）】",
    cards,
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
    buildProductsSection(context.products),
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
