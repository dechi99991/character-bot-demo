/**
 * 決定的レコメンダ（単一の真実 / Single Source of Truth）
 *
 * 【Why — なぜこのモジュールが必要か】
 * これまでレコメンド判断ロジックが3箇所に分裂していた：
 *   (1) プロンプト（CHARACTER_SETTING_BASE のガードレール + 動的 SalesRules + ヒント
 *       + chat-handler のコード側キーワード注入）… real LLM を駆動
 *   (2) mock-chat-handler.ts の pickProductByAttributes + SalesRule ループ … mock/テストを駆動
 *   (3) SEED_SALES_RULES のキーワード文字列
 * これらが「別々のキーワードリスト」で発散し、片方を直してもテスト（mock）は別経路を
 * 通るため「直したのに直らない」状態を生んでいた。
 *
 * 本モジュールは商品選択ロジックを1関数 `recommend()` に集約する。
 *   - mock-chat-handler … この関数の戻り値をそのまま文面化する
 *   - chat-handler（real LLM） … この関数で「出す商品」を確定し、LLM には
 *     「この商品をチャ・レノンの口調で紹介して」とだけ依頼する（口調のみ LLM 担当）
 *   - テスト … この純関数を直接検証する（LLM 不要・決定的・高速）
 *
 * これにより「どの商品を出すか」は real/mock/test の全経路で同一保証される。
 *
 * 【函 — 処理順（CHARACTER_SETTING_BASE のガードレール順を踏襲）】
 *   0. キャンペーン上書き（SalesRule の明示キーワード一致 → 安全フィルタ通過なら採用）
 *   1. ① カフェイン除外（ハード・安全最優先）
 *   2. ② 苦手除外（味要素「強」を除外）＋好み（③）抽出
 *   3. スコアリング（好み一致 / シーン / 気分）
 *   4. 採否判定:
 *        - 味/シーン/気分がマッチ → 最高スコア（同点は featured 優先）
 *        - 初心者意図のみ → 詰め合わせセット
 *        - カフェイン制約のみ（スコア0） → 制約内の先頭（雑談に落とさない）
 *        - 制約もマッチも無し → null（純粋な雑談。商品を押し付けない）
 *
 * 【設計判断 — featured ボーナスを廃止した理由】
 * 旧 pickProductByAttributes は全 featured 商品に一律 +1 を与えており、
 * 何もマッチしなくても配列先頭の featured（茶のことはじめ）がスコア1で常勝していた。
 * これが「無関係入力 → 茶のことはじめ」の真因。featured は「同点時のタイブレーク」に降格する。
 */

import type { ShopifyProduct, SalesRule, TasteLevel } from "@/lib/db";

/** レコメンド結果。null は「今回は商品を出さない（雑談継続）」を意味する。 */
export interface RecommendResult {
  product: ShopifyProduct;
  /** 提案理由の方向性（文面化・プロンプト注入に使う） */
  reason: string;
  /** どの判断経路で選ばれたか（デバッグ・テスト・ログ用） */
  source: "campaign" | "caffeine" | "taste" | "beginner" | "scene-mood";
}

// ============================================================
// 意図抽出（キーワードテーブルは「ここ1箇所」に集約する）
// ============================================================

/**
 * カフェインを控えたい意図。
 * 「睡眠」「夜」など活用に左右されにくい語幹で拾う（部分一致の脆弱性を回避）。
 */
const RE_LOW_CAFFEINE =
  /カフェイン(控|少|低|抜|フリー)|ノンカフェイン|睡眠|安眠|快眠|寝付|寝る前|夜(に|の|だ|遅|飲)|眠れ|妊娠|妊婦|授乳|子ども|子供/;
const RE_ZERO_CAFFEINE = /カフェイン(ゼロ|なし|0)|デカフェ|ノンカフェイン/;

/** 初心者・ギフト導線（④）。 */
const RE_BEGINNER =
  /初心者|はじめて|初めて|何から|どれから|迷っ|わからな|分からな|選べな|プレゼント|ギフト|贈り|手土産/;

/**
 * 味の「好み」（③）。語幹マッチで活用形を吸収する。
 *   甘 → 甘い/甘く/甘さ/甘み/甘め をすべてカバー
 */
const RE_LIKE_SWEET = /甘/;
const RE_LIKE_UMAMI = /旨味|旨み|うま味|うまみ|コク|まろやか/;
const RE_LIKE_ROASTY = /香ばし|焙煎|ほうじ|香り高/;

/**
 * 味の「苦手」（②）。「渋」「苦」＋否定/忌避語の共起で判定する。
 *   「渋みのない」「渋くない」「渋み少なめ」「渋いの苦手」等を活用差なく拾う。
 */
const RE_NEG_SUFFIX = /(ない|無|少な|控|抑|苦手|嫌|だめ|ダメ)/;
function dislikeAstringency(text: string): boolean {
  return /渋/.test(text) && RE_NEG_SUFFIX.test(text);
}
function dislikeBitter(text: string): boolean {
  // 「苦手」の「苦」で誤検知しないよう、苦手を除いた本文で苦味忌避を見る
  const stripped = text.replace(/苦手/g, "");
  return /苦/.test(stripped) && RE_NEG_SUFFIX.test(text);
}

/** シーン語 → 商品 scenes の値。 */
const SCENE_MAP: Record<string, RegExp> = {
  朝: /朝|起き/,
  仕事の合間: /集中|仕事|作業|勉強|合間/,
  夜: /夜|就寝|寝る前|寝たい/,
  食後: /食後|ご飯のあと|食事のあと|食べたあと/,
  来客: /来客|お客|おもてなし|もてなし/,
};

/** 気分語 → 商品 moods の値。 */
const MOOD_MAP: Record<string, RegExp> = {
  シャキッと: /シャキ|スッキリ|すっきり|覚醒|頭(を|が)?(冴|さ)|目を覚ま/,
  落ち着き: /落ち着|リラックス|ほっと|ホッと|ゆっくり|癒/,
  甘い癒し: /甘|渋(み)?(が)?苦手|苦いの苦手/,
  特別な時間: /特別|大切|記念|ご褒美|ごほうび/,
};

// ============================================================
// 補助
// ============================================================

function caffeinePasses(
  p: ShopifyProduct,
  wantsLow: boolean,
  wantsZero: boolean
): boolean {
  if (wantsZero) return p.caffeineLevel === "ゼロ";
  if (wantsLow) return p.caffeineLevel === "低" || p.caffeineLevel === "ゼロ";
  return true;
}

/** 味要素が指定レベルか（tasteProfile 無し商品は false 扱い）。 */
function taste(p: ShopifyProduct, key: keyof NonNullable<ShopifyProduct["tasteProfile"]>, level: TasteLevel): boolean {
  return p.tasteProfile?.[key] === level;
}

// ============================================================
// 本体
// ============================================================

/**
 * ユーザー発言から最適な1商品を決定的に選ぶ。
 *
 * @param userText   ユーザーの最新発言
 * @param products   紹介可能な商品（listFeaturedProducts 相当）
 * @param salesRules 営業ルール（キャンペーン上書き用。優先度昇順想定）
 * @returns RecommendResult、または商品を出さない場合 null
 */
export function recommend(
  userText: string,
  products: ShopifyProduct[],
  salesRules: SalesRule[] = []
): RecommendResult | null {
  const text = userText ?? "";
  const available = products.filter((p) => p.enabled);
  if (available.length === 0) return null;

  const wantsLow = RE_LOW_CAFFEINE.test(text);
  const wantsZero = RE_ZERO_CAFFEINE.test(text);

  // 0. キャンペーン上書き（明示キーワード一致 かつ 安全フィルタ通過のときだけ）
  const sortedRules = [...salesRules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);
  for (const rule of sortedRules) {
    const keywords = rule.keywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (!keywords.some((kw) => text.includes(kw))) continue;
    const product = available.find((p) => p.name === rule.recommendProduct);
    if (product && caffeinePasses(product, wantsLow, wantsZero)) {
      return { product, reason: rule.recommendMessage, source: "campaign" };
    }
  }

  // 1. ① カフェイン除外（ハード）
  let candidates = available.filter((p) => caffeinePasses(p, wantsLow, wantsZero));
  if (candidates.length === 0) candidates = available; // 安全側フォールバック

  // 2. ② 苦手除外（味要素「強」を除外。profile 無し商品は判定不能なので残す）
  const negAstringency = dislikeAstringency(text);
  const negBitter = dislikeBitter(text);
  if (negAstringency) {
    candidates = candidates.filter((p) => !taste(p, "astringency", "強"));
  }
  if (negBitter) {
    candidates = candidates.filter((p) => !taste(p, "bitterness", "強"));
  }

  // 好み（③）抽出
  const likeSweet = RE_LIKE_SWEET.test(text);
  const likeUmami = RE_LIKE_UMAMI.test(text);
  const likeRoasty = RE_LIKE_ROASTY.test(text);

  const hasTasteIntent =
    likeSweet || likeUmami || likeRoasty || negAstringency || negBitter;
  const wantsBeginner = RE_BEGINNER.test(text);

  // 3. スコアリング（好み一致 +2 / 渋苦弱の合致 +1 / シーン +2 / 気分 +2）
  const matchedScenes = Object.entries(SCENE_MAP)
    .filter(([, re]) => re.test(text))
    .map(([scene]) => scene);
  const matchedMoods = Object.entries(MOOD_MAP)
    .filter(([, re]) => re.test(text))
    .map(([mood]) => mood);

  let anySceneMoodMatched = false;
  const scored = candidates.map((p) => {
    let score = 0;
    if (likeSweet && taste(p, "sweetness", "強")) score += 2;
    if (likeUmami && taste(p, "umami", "強")) score += 2;
    if (likeRoasty && taste(p, "roastiness", "強")) score += 2;
    if (negAstringency && taste(p, "astringency", "弱")) score += 1;
    if (negBitter && taste(p, "bitterness", "弱")) score += 1;
    for (const s of matchedScenes) {
      if (p.scenes.includes(s)) {
        score += 2;
        anySceneMoodMatched = true;
      }
    }
    for (const m of matchedMoods) {
      if (p.moods.includes(m)) {
        score += 2;
        anySceneMoodMatched = true;
      }
    }
    return { p, score };
  });

  // 同点は featured を優先（タイブレークのみ。一律ボーナスは与えない）
  scored.sort((a, b) => b.score - a.score || Number(b.p.featured) - Number(a.p.featured));

  // 4. 採否判定
  const top = scored[0];

  // 4-a. 味/シーン/気分の積極マッチがある → トップを採用
  if (top && top.score > 0 && (hasTasteIntent || anySceneMoodMatched)) {
    return {
      product: top.p,
      reason: "お好み・シーン・気分から選ぶなら、",
      source: hasTasteIntent ? "taste" : "scene-mood",
    };
  }

  // 4-b. 初心者意図 → 詰め合わせセット（味の好みが無いときのみ。③ > ④）
  if (wantsBeginner) {
    const set = candidates.find((p) => p.isSet);
    if (set) {
      return { product: set, reason: "迷ったらまずこれ、", source: "beginner" };
    }
  }

  // 4-c. カフェイン制約のみ（スコア0でも安全制約内で1点出す）
  if ((wantsLow || wantsZero) && top) {
    return {
      product: top.p,
      reason: "夜やカフェインを控えたいときは、",
      source: "caffeine",
    };
  }

  // 4-d. 制約もマッチも無い → 商品を出さない（雑談継続）
  return null;
}
