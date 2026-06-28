/**
 * recommend()（決定的レコメンダ）のユニットテスト。
 *
 * 【Why ここをテストするか】
 * real LLM の出力は非決定的でユニットテストできない。一方で「どの商品を出すか」の
 * 判断は lib/recommend.ts に集約され、real/mock/test の全経路がこの純関数を通る。
 * よってこの関数を直接検証すれば、LLM を呼ばずにレコメンド判断の正しさを保証できる。
 *
 * Seed は getDataStore() 経由で取得する（SEED_* は非公開のため）。
 */
import { describe, it, expect, beforeAll } from "vitest";
import { getDataStore, type ShopifyProduct, type SalesRule } from "@/lib/db";
import { recommend } from "@/lib/recommend";

let products: ShopifyProduct[] = [];
let salesRules: SalesRule[] = [];

beforeAll(async () => {
  const store = getDataStore();
  [products, salesRules] = await Promise.all([
    store.listFeaturedProducts(),
    store.listActiveSalesRules(),
  ]);
});

const rec = (text: string) => recommend(text, products, salesRules);
const recSafety = (text: string, safetyText: string) =>
  recommend(text, products, salesRules, safetyText);

describe("recommend — 味属性指定（バグの本丸）", () => {
  it("『甘くて渋みのないお茶が飲みたい』→ あまもあ", () => {
    const r = rec("甘くて渋みのないお茶が飲みたい");
    expect(r?.product?.name).toBe("あまもあ");
  });

  // 回帰ガード: この入力で茶のことはじめを返してはならない（旧バグの再発検知）
  it("『甘くて渋みのないお茶が飲みたい』→ 茶のことはじめ ではない", () => {
    const r = rec("甘くて渋みのないお茶が飲みたい");
    expect(r?.product?.name).not.toBe("茶のことはじめ");
  });

  it("活用差吸収: 『甘いお茶』→ あまもあ", () => {
    expect(rec("甘いお茶ありますか")?.product?.name).toBe("あまもあ");
  });

  it("助詞差吸収: 『渋みが少ないのがいい』→ 渋味が強でない（ながとき除外）", () => {
    const r = rec("渋みが少ないのがいい");
    expect(r).not.toBeNull();
    expect(r?.product?.name).not.toBe("ながとき");
  });

  it("『渋いのが苦手』→ 渋味=強 のながときは出さない", () => {
    expect(rec("渋いのが苦手なんだよね")?.product?.name).not.toBe("ながとき");
  });
});

describe("recommend — カフェイン（ハードガードレール①）", () => {
  it("『夜ぐっすり寝たい』→ カフェイン低のこがれ", () => {
    expect(rec("夜ぐっすり寝たい")?.product?.name).toBe("こがれ");
  });

  it("『睡眠に良いお茶は』→ こがれ（旧 featured バグの回帰ガード）", () => {
    const r = rec("睡眠に良いお茶は");
    expect(r?.product?.name).toBe("こがれ");
    expect(r?.product?.caffeineLevel).not.toBe("高");
  });
});

describe("recommend — 初心者導線（④）", () => {
  it("『初心者で何から始めれば』→ 詰め合わせセット 茶のことはじめ", () => {
    const r = rec("初心者で何から始めればいいか分からない");
    expect(r?.product?.isSet).toBe(true);
    expect(r?.product?.name).toBe("茶のことはじめ");
  });

  it("好み(③) > 初心者(④): 『甘いの初心者向け』→ あまもあ", () => {
    expect(rec("甘いお茶で初心者向けのある？")?.product?.name).toBe("あまもあ");
  });
});

describe("recommend — シーン・気分", () => {
  it("『朝シャキッとしたい』→ とこのは", () => {
    expect(rec("朝シャキッとしたい")?.product?.name).toBe("とこのは");
  });
});

describe("recommend — 雑談は商品を出さない（null）", () => {
  it("『こんにちは』→ null", () => {
    expect(rec("こんにちは")).toBeNull();
  });

  it("『梅雨だるいね』→ null（制約もマッチも無い）", () => {
    expect(rec("梅雨でなんかだるいね")).toBeNull();
  });
});

describe("recommend — カフェインゼロ no-candidate（P0修正）", () => {
  it("『デカフェのお茶ありますか』→ no-candidate（product=null）", () => {
    const r = rec("デカフェのお茶ありますか");
    expect(r).not.toBeNull();
    expect(r?.source).toBe("no-candidate");
    expect(r?.product).toBeNull();
  });

  it("『カフェインゼロが欲しい』→ no-candidate（中/高カフェイン商品を出さない）", () => {
    const r = rec("カフェインゼロが欲しい");
    expect(r?.source).toBe("no-candidate");
    expect(r?.product).toBeNull();
  });

  it("『ノンカフェインのお茶を探してます』→ no-candidate", () => {
    const r = rec("ノンカフェインのお茶を探してます");
    expect(r?.source).toBe("no-candidate");
    expect(r?.product).toBeNull();
  });
});

describe("recommend — §5-D 明示属性指定（産地・品種・製法）", () => {
  it("品種名指し: 『やぶきたが飲みたい』→ セット以外を優先しとこのは", () => {
    const r = rec("やぶきたが飲みたい");
    expect(r?.source).toBe("attribute");
    expect(r?.product?.name).toBe("とこのは");
  });

  it("産地名指し: 『鹿児島のお茶ください』→ とこのは", () => {
    const r = rec("鹿児島のお茶ください");
    expect(r?.source).toBe("attribute");
    expect(r?.product?.name).toBe("とこのは");
  });

  it("品種名指し: 『さえあかりはありますか』→ セット以外を優先しあまもあ", () => {
    const r = rec("さえあかりはありますか");
    expect(r?.source).toBe("attribute");
    expect(r?.product?.name).toBe("あまもあ");
  });

  it("製法名指し: 『深蒸しが好き』→ とこのは（深蒸しはとこのは固有）", () => {
    const r = rec("深蒸しが好き");
    expect(r?.source).toBe("attribute");
    expect(r?.product?.name).toBe("とこのは");
  });

  it("産地名指し: 『奈良のお茶を試したい』→ こがれ", () => {
    const r = rec("奈良のお茶を試したい");
    expect(r?.source).toBe("attribute");
    expect(r?.product?.name).toBe("こがれ");
  });
});

describe("recommend — safetyText マルチターン安全検出", () => {
  it("前ターンで『妊娠中』→ 今の曖昧な入力でもカフェイン低のこがれ", () => {
    const r = recSafety("何かおすすめ", "妊娠中なので気をつけたいです");
    expect(r?.source).toBe("caffeine");
    expect(r?.product?.caffeineLevel).not.toBe("高");
    expect(r?.product?.caffeineLevel).not.toBe("中");
  });

  it("前ターンで『デカフェ希望』→ 今の曖昧な入力でも no-candidate", () => {
    const r = recSafety("どれがいいですか", "デカフェのものを探してます");
    expect(r?.source).toBe("no-candidate");
    expect(r?.product).toBeNull();
  });
});
