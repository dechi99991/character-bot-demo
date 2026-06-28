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

describe("recommend — 味属性指定（バグの本丸）", () => {
  it("『甘くて渋みのないお茶が飲みたい』→ あまもあ", () => {
    const r = rec("甘くて渋みのないお茶が飲みたい");
    expect(r?.product.name).toBe("あまもあ");
  });

  // 回帰ガード: この入力で茶のことはじめを返してはならない（旧バグの再発検知）
  it("『甘くて渋みのないお茶が飲みたい』→ 茶のことはじめ ではない", () => {
    const r = rec("甘くて渋みのないお茶が飲みたい");
    expect(r?.product.name).not.toBe("茶のことはじめ");
  });

  it("活用差吸収: 『甘いお茶』→ あまもあ", () => {
    expect(rec("甘いお茶ありますか")?.product.name).toBe("あまもあ");
  });

  it("助詞差吸収: 『渋みが少ないのがいい』→ 渋味が強でない（ながとき除外）", () => {
    const r = rec("渋みが少ないのがいい");
    expect(r).not.toBeNull();
    expect(r?.product.name).not.toBe("ながとき");
  });

  it("『渋いのが苦手』→ 渋味=強 のながときは出さない", () => {
    expect(rec("渋いのが苦手なんだよね")?.product.name).not.toBe("ながとき");
  });
});

describe("recommend — カフェイン（ハードガードレール①）", () => {
  it("『夜ぐっすり寝たい』→ カフェイン低のこがれ", () => {
    expect(rec("夜ぐっすり寝たい")?.product.name).toBe("こがれ");
  });

  it("『睡眠に良いお茶は』→ こがれ（旧 featured バグの回帰ガード）", () => {
    const r = rec("睡眠に良いお茶は");
    expect(r?.product.name).toBe("こがれ");
    expect(r?.product.caffeineLevel).not.toBe("高");
  });
});

describe("recommend — 初心者導線（④）", () => {
  it("『初心者で何から始めれば』→ 詰め合わせセット 茶のことはじめ", () => {
    const r = rec("初心者で何から始めればいいか分からない");
    expect(r?.product.isSet).toBe(true);
    expect(r?.product.name).toBe("茶のことはじめ");
  });

  it("好み(③) > 初心者(④): 『甘いの初心者向け』→ あまもあ", () => {
    expect(rec("甘いお茶で初心者向けのある？")?.product.name).toBe("あまもあ");
  });
});

describe("recommend — シーン・気分", () => {
  it("『朝シャキッとしたい』→ とこのは", () => {
    expect(rec("朝シャキッとしたい")?.product.name).toBe("とこのは");
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
