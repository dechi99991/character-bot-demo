/**
 * 決定的レコメンダ（単一の真実 / Single Source of Truth）
 *
 * 【Why — なぜこのモジュールが必要か】
 * 商品選択ロジックを1関数に集約し、real/mock/test の全経路で同一保証する。
 * LLM は口調のみ担当（どの商品を出すか はここで決定的に確定）。
 *
 * 【函 — 処理順（藤井さん設計書 §5 のガードレール順に準拠）】
 *   §5-A カフェイン除外（ハード・安全最優先）→ 候補ゼロなら no-candidate
 *   §5-D 明示属性指定（産地・品種・製法の名指し）→ 候補ゼロなら no-candidate
 *   §5-B 苦手除外（味要素「強」を除外）
 *   キャンペーン上書き（§5-A〜B 通過後の候補から選ぶ）
 *   §5-C 好み（「強」商品を優先 +3）＋シーン/気分（+2）スコアリング
 *   採否判定:
 *     - 積極マッチ → 最高スコア（同点は featured タイブレーク）
 *     - 属性指定あり・スコアゼロ → 属性合致の最良商品（isSet でないものを優先）
 *     - 初心者意図 → 詰め合わせセット
 *     - カフェイン制約のみ → 制約内の先頭
 *     - 制約もマッチも無し → null（純粋な雑談。商品を押し付けない）
 *
 * 【設計判断】
 * - featured 一律ボーナス廃止（旧バグ）: featured は同点タイブレークのみ
 * - Campaign は §5-A〜B の後に置くことで安全ガードレールを最優先にする
 * - safetyText: マルチターン会話でカフェイン・苦手制約を直近 N ターン横断して検出する
 */

import type { ShopifyProduct, SalesRule, TasteLevel } from "@/lib/db";

/**
 * レコメンド結果。
 * - null: 商品を出さない（雑談継続）
 * - source === "no-candidate": 条件に合う商品がない（正直に伝える）
 * - それ以外: product に選択商品が入る
 */
export interface RecommendResult {
  product: ShopifyProduct | null;
  reason: string;
  source: "campaign" | "caffeine" | "taste" | "beginner" | "scene-mood" | "attribute" | "no-candidate";
}

// ============================================================
// 意図抽出（キーワードテーブルは「ここ1箇所」に集約する）
// ============================================================

const RE_LOW_CAFFEINE =
  /カフェイン(控|少|低|抜|フリー)|ノンカフェイン|睡眠|安眠|快眠|寝付|寝る前|夜(に|の|だ|遅|飲)|眠れ|妊娠|妊婦|授乳|子ども|子供/;
const RE_ZERO_CAFFEINE = /カフェイン(ゼロ|なし|0)|デカフェ|ノンカフェイン/;

const RE_BEGINNER =
  /初心者|はじめて|初めて|何から|どれから|迷っ|わからな|分からな|選べな|プレゼント|ギフト|贈り|手土産/;

const RE_LIKE_SWEET = /甘/;
const RE_LIKE_UMAMI = /旨味|旨み|うま味|うまみ|コク|まろやか/;
const RE_LIKE_ROASTY = /香ばし|焙煎|ほうじ|香り高/;

const RE_NEG_SUFFIX = /(ない|無|少な|控|抑|苦手|嫌|だめ|ダメ)/;
function dislikeAstringency(text: string): boolean {
  return /渋/.test(text) && RE_NEG_SUFFIX.test(text);
}
function dislikeBitter(text: string): boolean {
  const stripped = text.replace(/苦手/g, "");
  return /苦/.test(stripped) && RE_NEG_SUFFIX.test(text);
}

const SCENE_MAP: Record<string, RegExp> = {
  朝: /朝|起き/,
  仕事の合間: /集中|仕事|作業|勉強|合間/,
  夜: /夜|就寝|寝る前|寝たい/,
  食後: /食後|ご飯のあと|食事のあと|食べたあと/,
  来客: /来客|お客|おもてなし|もてなし/,
};

const MOOD_MAP: Record<string, RegExp> = {
  シャキッと: /シャキ|スッキリ|すっきり|覚醒|頭(を|が)?(冴|さ)|目を覚ま/,
  落ち着き: /落ち着|リラックス|ほっと|ホッと|ゆっくり|癒/,
  甘い癒し: /甘|渋(み)?(が)?苦手|苦いの苦手/,
  特別な時間: /特別|大切|記念|ご褒美|ごほうび/,
};

// ============================================================
// 補助
// ============================================================

function caffeinePasses(p: ShopifyProduct, wantsLow: boolean, wantsZero: boolean): boolean {
  if (wantsZero) return p.caffeineLevel === "ゼロ";
  if (wantsLow) return p.caffeineLevel === "低" || p.caffeineLevel === "ゼロ";
  return true;
}

function taste(
  p: ShopifyProduct,
  key: keyof NonNullable<ShopifyProduct["tasteProfile"]>,
  level: TasteLevel
): boolean {
  return p.tasteProfile?.[key] === level;
}

/**
 * §5-D 明示属性指定（産地・品種・製法の名指し）。
 * ユーザーが固有属性（産地・品種・製法）を名指しした場合、合致商品のみに候補を絞る。
 * - 名指し検出なし → {filtered: candidates, hasExplicit: false}
 * - 名指しあり・合致あり → {filtered: 合致商品, hasExplicit: true}
 * - 名指しあり・合致なし → {filtered: [], hasExplicit: true}（呼び出し側で no-candidate）
 */
function applyAttributeFilter(
  text: string,
  candidates: ShopifyProduct[]
): { filtered: ShopifyProduct[]; hasExplicit: boolean } {
  const BLOCKLIST = new Set(["合組", "全国各地", "セット", "少量"]);

  // 産地から都道府県名のみ抽出（「奈良県大和郡山」→「奈良」）
  const extractPref = (origin: string): string => {
    const m = origin.match(/^([^\s県府都道市区町村]+)/);
    return m ? m[1] : "";
  };

  const tokenToIds = new Map<string, Set<number>>();
  const register = (token: string, id: number) => {
    const t = token.trim();
    if (t.length < 2 || BLOCKLIST.has(t)) return;
    if (!tokenToIds.has(t)) tokenToIds.set(t, new Set());
    tokenToIds.get(t)!.add(id);
  };

  for (const p of candidates) {
    if (p.cultivar) p.cultivar.split(/[・,、]/).forEach((v) => register(v, p.id));
    if (p.origin) {
      const pref = extractPref(p.origin);
      if (pref) register(pref, p.id);
    }
    if (p.processing) p.processing.split(/[・,、]/).forEach((v) => register(v, p.id));
  }

  const matchedIds = new Set<number>();
  let hasExplicit = false;
  for (const [token, ids] of tokenToIds) {
    if (text.includes(token)) {
      hasExplicit = true;
      ids.forEach((id) => matchedIds.add(id));
    }
  }

  if (!hasExplicit) return { filtered: candidates, hasExplicit: false };
  return { filtered: candidates.filter((p) => matchedIds.has(p.id)), hasExplicit: true };
}

// ============================================================
// 本体
// ============================================================

/**
 * ユーザー発言から最適な1商品を決定的に選ぶ。
 *
 * @param userText   ユーザーの最新発言（スコアリング・キャンペーン判定に使う）
 * @param products   紹介可能な商品（listFeaturedProducts 相当）
 * @param salesRules 営業ルール（キャンペーン上書き用。優先度昇順想定）
 * @param safetyText 直近 N ターンのユーザー発言結合（カフェイン・苦手・属性の安全検出用）
 *                   省略時は userText を使用（単一ターンテスト互換）
 */
export function recommend(
  userText: string,
  products: ShopifyProduct[],
  salesRules: SalesRule[] = [],
  safetyText?: string
): RecommendResult | null {
  const text = userText ?? "";
  const safe = safetyText ?? text; // 安全ガードレール用（マルチターン対応）

  const available = products.filter((p) => p.enabled);
  if (available.length === 0) return null;

  const wantsLow = RE_LOW_CAFFEINE.test(safe);
  const wantsZero = RE_ZERO_CAFFEINE.test(safe);

  // §5-A カフェイン除外（安全最優先）
  let candidates = available.filter((p) => caffeinePasses(p, wantsLow, wantsZero));
  if (candidates.length === 0 && (wantsLow || wantsZero)) {
    const constraint = wantsZero ? "カフェインゼロ" : "低カフェイン";
    return {
      product: null,
      reason: `${constraint}の商品は現在ご用意がございません。`,
      source: "no-candidate",
    };
  }

  // §5-D 明示属性指定（産地・品種・製法の名指し）
  const { filtered: attrFiltered, hasExplicit } = applyAttributeFilter(safe, candidates);
  if (hasExplicit && attrFiltered.length === 0) {
    return {
      product: null,
      reason: "ご指定の産地・品種・製法の商品は現在ご用意がございません。",
      source: "no-candidate",
    };
  }
  if (hasExplicit) candidates = attrFiltered;

  // §5-B 苦手除外（味要素「強」を除外。profile 無し商品は判定不能なので残す）
  const negAstringency = dislikeAstringency(safe);
  const negBitter = dislikeBitter(safe);
  if (negAstringency) candidates = candidates.filter((p) => !taste(p, "astringency", "強"));
  if (negBitter) candidates = candidates.filter((p) => !taste(p, "bitterness", "強"));

  // キャンペーン上書き（§5-A〜B 通過後の候補から探す。安全ガードレールを尊重）
  const sortedRules = [...salesRules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);
  for (const rule of sortedRules) {
    const keywords = rule.keywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (!keywords.some((kw) => text.includes(kw))) continue;
    const product = candidates.find((p) => p.name === rule.recommendProduct);
    if (product) {
      return { product, reason: rule.recommendMessage, source: "campaign" };
    }
  }

  // §5-C 好み抽出
  const likeSweet = RE_LIKE_SWEET.test(text);
  const likeUmami = RE_LIKE_UMAMI.test(text);
  const likeRoasty = RE_LIKE_ROASTY.test(text);
  const hasTasteIntent = likeSweet || likeUmami || likeRoasty || negAstringency || negBitter;
  const wantsBeginner = RE_BEGINNER.test(safe);

  // スコアリング（§5-C 好み +3 / 渋苦弱の合致 +1 / §6 シーン・気分 +2）
  // 好みを +3 にすることで「シーン一致(+2)」より「明言した好み」が勝つ（§5 > §6）
  const matchedScenes = Object.entries(SCENE_MAP)
    .filter(([, re]) => re.test(text))
    .map(([scene]) => scene);
  const matchedMoods = Object.entries(MOOD_MAP)
    .filter(([, re]) => re.test(text))
    .map(([mood]) => mood);

  let anySceneMoodMatched = false;
  const scored = candidates.map((p) => {
    let score = 0;
    if (likeSweet && taste(p, "sweetness", "強")) score += 3;
    if (likeUmami && taste(p, "umami", "強")) score += 3;
    if (likeRoasty && taste(p, "roastiness", "強")) score += 3;
    if (negAstringency && taste(p, "astringency", "弱")) score += 1;
    if (negBitter && taste(p, "bitterness", "弱")) score += 1;
    for (const s of matchedScenes) {
      if (p.scenes.includes(s)) { score += 2; anySceneMoodMatched = true; }
    }
    for (const m of matchedMoods) {
      if (p.moods.includes(m)) { score += 2; anySceneMoodMatched = true; }
    }
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score || Number(b.p.featured) - Number(a.p.featured));

  const top = scored[0];

  // 採否判定
  // 4-a. 味/シーン/気分の積極マッチ
  if (top && top.score > 0 && (hasTasteIntent || anySceneMoodMatched)) {
    return {
      product: top.p,
      reason: "お好み・シーン・気分から選ぶなら、",
      source: hasTasteIntent ? "taste" : "scene-mood",
    };
  }

  // 4-b. 属性指定あり・スコアゼロ → 属性合致の最良商品（セット以外を優先）
  if (hasExplicit && candidates.length > 0) {
    const best = candidates.find((p) => !p.isSet) ?? candidates[0];
    return {
      product: best,
      reason: "ご指定の産地・品種・製法から選ぶなら、",
      source: "attribute",
    };
  }

  // 4-c. 初心者意図 → 詰め合わせセット（味の好みが無いときのみ）
  if (wantsBeginner) {
    const set = candidates.find((p) => p.isSet);
    if (set) return { product: set, reason: "迷ったらまずこれ、", source: "beginner" };
  }

  // 4-d. カフェイン制約のみ（スコア0でも安全制約内で1点出す）
  if ((wantsLow || wantsZero) && top) {
    return {
      product: top.p,
      reason: "夜やカフェインを控えたいときは、",
      source: "caffeine",
    };
  }

  // 4-e. 制約もマッチも無し → 商品を出さない（雑談継続）
  return null;
}
