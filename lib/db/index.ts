/**
 * DB アクセス抽象レイヤー
 *
 * 【Why】
 * Cloudflare Workers + D1 への移行を見据え、ビジネスロジックを
 * 特定のDB実装から切り離す。チャットのコアロジック（chat-handler）は
 * この `ChatDataStore` インターフェースにのみ依存する。
 *
 * 現状は InMemoryDataStore（Seed データあり）。
 * D1 への接続は `D1ChatDataStore` のような実装クラスをこのファイルに追加し、
 * `getDataStore()` の返り値を差し替えるだけで移行が完了する設計。
 *
 * 対応DB:
 *   ① topics            … 話題DB（雑談モードのコンテキスト補強）
 *   ② sales_rules       … 営業ルールDB（キーワード×レコメンド）
 *   ④ conversation_logs … 会話ログ（書き込みのみ。参照は将来フェーズ）
 *
 * ※ ③ キャラクター設定はファイルベース（lib/character.ts）のためDB対象外。
 */

// ============================================================
// ドメイン型定義（DBスキーマと1:1対応させる）
// ============================================================

/** ① 話題DB: 時事・雑談トピック1件 */
export interface Topic {
  id: number;
  /** 話題のタイトル（例: "梅雨の過ごし方"） */
  title: string;
  /** 話題の本文・補足情報。プロンプトに注入される */
  body: string;
  /** 有効/無効フラグ。無効な話題はコンテキストに含めない */
  enabled: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** ② 営業ルールDB: キーワード×レコメンドのマッピング1件 */
export interface SalesRule {
  id: number;
  /**
   * マッチ対象キーワード（カンマ区切りで複数）。
   * 例: "疲れた,忙しい,休みたい"
   */
  keywords: string;
  /** レコメンドする商品名（例: "Midnight Roaster"） */
  recommendProduct: string;
  /** レコメンド時のトーク・理由（プロンプトに注入される） */
  recommendMessage: string;
  /** 有効/無効フラグ */
  enabled: boolean;
  /** 優先度（複数マッチ時の解決用。小さいほど優先） */
  priority: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** 味の強さ3段階（味プロファイル各要素で使用） */
export type TasteLevel = "弱" | "中" | "強";
/** カフェイン量4段階（ハードガードレール①の判定軸） */
export type CaffeineLevel = "高" | "中" | "低" | "ゼロ";
/** 淹れやすさ3段階（初心者導線④の判定軸） */
export type BrewingDifficulty = "やさしい" | "ふつう" | "シビア";

/**
 * 味プロファイル: 商品の味わいを5要素で構造化。
 * ハードガードレール②（苦手除外）・③（好み必須）の判定に使う。
 */
export interface TasteProfile {
  /** 旨味 */
  umami: TasteLevel;
  /** 渋味 */
  astringency: TasteLevel;
  /** 苦味 */
  bitterness: TasteLevel;
  /** 甘味 */
  sweetness: TasteLevel;
  /** 香ばしさ */
  roastiness: TasteLevel;
}

/**
 * ③ Shopify 商品マスタ: チャットで紹介できる商品1件
 * Shopify 側の在庫・価格は定期同期 or Webhook で更新する想定。
 *
 * 【設計方針】キーワードマッチ用の `tags` を廃止し、
 * シーン・気分・味プロファイル等の構造化フィールドに置き換えた。
 * これによりレコメンド制御（ハードガードレール／ソフト推薦）を
 * LLM が属性ベースで適用できる。
 */
export interface ShopifyProduct {
  id: number;
  /** 商品名（例: "深呼吸のほうじ茶"）*/
  name: string;
  /** Shopify 商品ページ URL */
  shopifyUrl: string;
  /** チャットで使う短い紹介文（1〜2文） */
  description: string;
  /** 会話のフックになる一言ストーリー */
  story: string;
  /** カテゴリ（煎茶/ほうじ茶/玉露/和紅茶/番茶 等） */
  category: string;
  /** 産地（未確定なら undefined） */
  origin?: string;
  /** 農園（未確定なら undefined） */
  farm?: string;
  /** 品種（未確定なら undefined） */
  cultivar?: string;
  /** 製法（未確定なら undefined） */
  processing?: string;
  /** 味プロファイル（旨味/渋味/苦味/甘味/香ばしさ）。セット商品は undefined */
  tasteProfile?: TasteProfile;
  /** カフェイン量（ハードガードレール①の判定軸） */
  caffeineLevel: CaffeineLevel;
  /** 淹れやすさ（初心者導線④の判定軸） */
  brewingDifficulty: BrewingDifficulty;
  /** 合うシーン（朝/仕事の合間/食後/夜/来客 等） */
  scenes: string[];
  /** 気分・役割（シャキッと/落ち着き/甘い癒し/特別な時間 等） */
  moods: string[];
  /** 飲み方（急須/ティーバッグ/水出し/ミルク・料理 等） */
  brewingMethods: string[];
  /** 用途（自分用/ギフト/法人 等） */
  purposes: string[];
  /** 詰め合わせセットフラグ（初心者導線④の第一候補判定） */
  isSet: boolean;
  /** 定価（円・税込） */
  price: number;
  /** セール価格（セール中のみ設定） */
  salePrice?: number;
  /** 現在セール中フラグ */
  onSale: boolean;
  /** チャットでの優先紹介フラグ */
  featured: boolean;
  /** 有効/無効（在庫切れ・取り扱い停止時に false） */
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** ④ 会話ログ: 書き込み用の入力 */
export interface ConversationLogInput {
  /** セッション/会話単位の識別子（フロント発番 or サーバ発番） */
  sessionId: string;
  /** "user" | "assistant" */
  role: "user" | "assistant";
  /** メッセージ本文 */
  content: string;
  /** 判定された会話モード（任意） */
  mode?: "smalltalk" | "sales" | "unknown";
}

// ============================================================
// 抽象インターフェース
// ============================================================

/**
 * チャット・管理 API が必要とするデータアクセスの抽象。
 * 実装（InMemory / D1 / テストモック）がこの IF を満たす。
 */
export interface ChatDataStore {
  // ---- チャット用（読み取り） ----

  /** ① 有効な話題を取得（雑談コンテキスト用） */
  listActiveTopics(): Promise<Topic[]>;
  /** ② 有効な営業ルールを取得（レコメンド判定用） */
  listActiveSalesRules(): Promise<SalesRule[]>;
  /** ③ 有効・紹介対象の Shopify 商品を取得 */
  listFeaturedProducts(): Promise<ShopifyProduct[]>;
  /** ④ 会話ログを1件書き込む */
  appendConversationLog(log: ConversationLogInput): Promise<void>;

  // ---- 管理 API 用（CRUD） ----

  listAllTopics(): Promise<Topic[]>;
  createTopic(
    data: Omit<Topic, "id" | "createdAt" | "updatedAt">
  ): Promise<Topic>;
  updateTopic(
    id: number,
    data: Partial<Omit<Topic, "id" | "createdAt">>
  ): Promise<Topic | null>;
  deleteTopic(id: number): Promise<boolean>;

  listAllSalesRules(): Promise<SalesRule[]>;
  createSalesRule(
    data: Omit<SalesRule, "id" | "createdAt" | "updatedAt">
  ): Promise<SalesRule>;
  updateSalesRule(
    id: number,
    data: Partial<Omit<SalesRule, "id" | "createdAt">>
  ): Promise<SalesRule | null>;
  deleteSalesRule(id: number): Promise<boolean>;
}

// ============================================================
// Seed データ
// ============================================================

const now = new Date().toISOString();

const SEED_TOPICS: Topic[] = [
  {
    id: 1,
    title: "梅雨の過ごし方",
    body: "じめじめした季節こそ、香ばしいほうじ茶の香りが気分転換になる。蒸し暑い日は湯温を少し下げて淹れると飲みやすい。",
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    title: "暑気払いの水出し緑茶",
    body: "夏は水出し煎茶がおすすめ。冷水ポットに茶葉を入れて冷蔵庫で一晩置くだけ。苦味が出にくく甘みが引き立つ。",
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
];

const SEED_SALES_RULES: SalesRule[] = [
  {
    id: 1,
    keywords: "疲れた,しんどい,夜,眠れない,寝る前,リラックス,ほうじ茶",
    recommendProduct: "こがれ",
    recommendMessage:
      "7年寝かせた茶葉をじっくり火入れした「こがれ」。カフェインが低いから夜でも安心。香ばしさが一日を静かに畳んでくれます。",
    enabled: true,
    priority: 10,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    keywords: "集中したい,シャキッとしたい,朝,仕事,勉強,覚醒",
    recommendProduct: "とこのは",
    recommendMessage:
      "王道のやぶきたを被せて深蒸しにした「とこのは」。誰が淹れても旨味がしっかり出る、日常の格。朝の一杯に。",
    enabled: true,
    priority: 20,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 3,
    keywords: "初心者,はじめて,何から,迷ってる,プレゼント,ギフト,贈り物",
    recommendProduct: "茶のことはじめ",
    recommendMessage:
      "迷ったらこれ。代表が選んだ5種類を少量ずつ試せるセット。初めての方が失敗しないよう設計された入門セットです。",
    enabled: true,
    priority: 5,
    createdAt: now,
    updatedAt: now,
  },
];

// ※ ShopifyURL は仮スラッグ。藤井さんから正式URL受領後に差し替える。
// ※ 30g版の価格を price に設定。4g版（¥400）は description に記載。
const SEED_PRODUCTS: ShopifyProduct[] = [
  {
    id: 1,
    name: "茶のことはじめ",
    shopifyUrl: "https://tayumano.myshopify.com/products/cha-no-kotohajime",
    description: "5種類を4gずつ試せる入門セット（¥2,780・税込）。迷ったらこれ。",
    story: "迷ったらこれ。代表が選んだ5種類を少量ずつ。初めての方が失敗しないセット。",
    category: "煎茶",
    cultivar: "やぶきた・しずかおり・さえあかり・在来・合組",
    origin: "全国各地",
    processing: "5種少量セット",
    // tasteProfile なし（複数品種ブレンドセットのため）
    caffeineLevel: "中",
    brewingDifficulty: "やさしい",
    scenes: ["仕事の合間"],
    moods: ["落ち着き"],
    brewingMethods: ["ティーバッグ", "急須"],
    purposes: ["ギフト", "自分用"],
    isSet: true,
    price: 2780,
    onSale: false,
    featured: true,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    name: "こがれ",
    shopifyUrl: "https://tayumano.myshopify.com/products/kogare",
    description: "7年熟成ほうじ茶。4g ¥400 / 30g ¥2,000（税込）。",
    story: "7年寝かせた茶葉をじっくり火入れ。香ばしくて、夜に一日を畳むときの一杯。",
    category: "ほうじ茶",
    cultivar: "合組",
    origin: "奈良県大和郡山",
    processing: "7年熟成・じっくり火入れ",
    tasteProfile: {
      umami: "中",
      astringency: "弱",
      bitterness: "弱",
      sweetness: "中",
      roastiness: "強",
    },
    caffeineLevel: "低",
    brewingDifficulty: "やさしい",
    scenes: ["夜", "食後"],
    moods: ["落ち着き"],
    brewingMethods: ["ティーバッグ", "急須"],
    purposes: ["自分用"],
    isSet: false,
    price: 2000,
    onSale: false,
    featured: true,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 3,
    name: "ながとき",
    shopifyUrl: "https://tayumano.myshopify.com/products/nagatoki",
    description: "樹齢100年超の在来種。4g ¥400 / 30g ¥2,000（税込）。淹れ方で表情が変わる上級者向け。",
    story: "樹齢100年超の在来。淹れ方で別の顔を見せる、向き合うための一杯。",
    category: "煎茶",
    cultivar: "在来",
    origin: "静岡市玉川",
    processing: "浅蒸し",
    tasteProfile: {
      umami: "中",
      astringency: "強",
      bitterness: "中",
      sweetness: "中",
      roastiness: "弱",
    },
    caffeineLevel: "高",
    brewingDifficulty: "シビア",
    scenes: ["来客"],
    moods: ["特別な時間", "落ち着き"],
    brewingMethods: ["急須"],
    purposes: ["ギフト", "自分用"],
    isSet: false,
    price: 2000,
    onSale: false,
    featured: true,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 4,
    name: "あまもあ",
    shopifyUrl: "https://tayumano.myshopify.com/products/amomoa",
    description: "さえあかり品種の蜜のような甘さ。4g ¥400 / 30g ¥2,000（税込）。",
    story: "さえあかりの蜜のような甘さ。渋みはほとんどなく、お茶が得意でない人ほど驚く一杯。",
    category: "煎茶",
    cultivar: "さえあかり",
    origin: "三重県四日市",
    processing: "被せ・浅蒸し",
    tasteProfile: {
      umami: "強",
      astringency: "弱",
      bitterness: "弱",
      sweetness: "強",
      roastiness: "弱",
    },
    caffeineLevel: "中",
    brewingDifficulty: "やさしい",
    scenes: ["仕事の合間", "食後"],
    moods: ["甘い癒し", "落ち着き"],
    brewingMethods: ["急須", "水出し"],
    purposes: ["ギフト", "自分用"],
    isSet: false,
    price: 2000,
    onSale: false,
    featured: true,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 5,
    name: "とこのは",
    shopifyUrl: "https://tayumano.myshopify.com/products/tokonoha",
    description: "王道やぶきたの深蒸し。4g ¥400 / 30g ¥2,000（税込）。誰が淹れても旨味が出る日常茶。",
    story: "王道のやぶきたを被せて深蒸しに。だれが淹れても旨味がしっかり出る、日常の格。",
    category: "煎茶",
    cultivar: "やぶきた",
    origin: "鹿児島県南九州市頴娃",
    processing: "被せ・深蒸し",
    tasteProfile: {
      umami: "強",
      astringency: "中",
      bitterness: "中",
      sweetness: "中",
      roastiness: "弱",
    },
    caffeineLevel: "高",
    brewingDifficulty: "ふつう",
    scenes: ["仕事の合間", "朝", "来客"],
    moods: ["シャキッと", "落ち着き"],
    brewingMethods: ["急須", "水出し"],
    purposes: ["ギフト", "自分用"],
    isSet: false,
    price: 2000,
    onSale: false,
    featured: true,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
];

// ============================================================
// In-Memory 実装（プロトタイプ用）
// ============================================================

/**
 * Seed データ付きの In-Memory 実装。
 *
 * 【注意】Vercel サーバーレス環境では cold start ごとにリセットされる。
 * warm インスタンス内では状態が保持されるため、動作確認は可能。
 * 本番（Cloudflare D1）移行時は `D1ChatDataStore` を実装して差し替える。
 */
class InMemoryDataStore implements ChatDataStore {
  private topics: Topic[] = SEED_TOPICS.map((t) => ({ ...t }));
  private salesRules: SalesRule[] = SEED_SALES_RULES.map((r) => ({ ...r }));
  private products: ShopifyProduct[] = SEED_PRODUCTS.map((p) => ({ ...p }));
  private nextTopicId = SEED_TOPICS.length + 1;
  private nextRuleId = SEED_SALES_RULES.length + 1;

  // ---- チャット用 ----

  async listActiveTopics(): Promise<Topic[]> {
    return this.topics.filter((t) => t.enabled);
  }

  async listActiveSalesRules(): Promise<SalesRule[]> {
    return this.salesRules
      .filter((r) => r.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  async listFeaturedProducts(): Promise<ShopifyProduct[]> {
    return this.products.filter((p) => p.enabled && p.featured);
  }

  async appendConversationLog(_log: ConversationLogInput): Promise<void> {
    // no-op: D1 への INSERT に差し替える（Phase 2）
  }

  // ---- 管理 API 用（Topics） ----

  async listAllTopics(): Promise<Topic[]> {
    return [...this.topics];
  }

  async createTopic(
    data: Omit<Topic, "id" | "createdAt" | "updatedAt">
  ): Promise<Topic> {
    const ts = new Date().toISOString();
    const topic: Topic = {
      id: this.nextTopicId++,
      ...data,
      createdAt: ts,
      updatedAt: ts,
    };
    this.topics.push(topic);
    return { ...topic };
  }

  async updateTopic(
    id: number,
    data: Partial<Omit<Topic, "id" | "createdAt">>
  ): Promise<Topic | null> {
    const idx = this.topics.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    this.topics[idx] = {
      ...this.topics[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return { ...this.topics[idx] };
  }

  async deleteTopic(id: number): Promise<boolean> {
    const idx = this.topics.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.topics.splice(idx, 1);
    return true;
  }

  // ---- 管理 API 用（SalesRules） ----

  async listAllSalesRules(): Promise<SalesRule[]> {
    return [...this.salesRules].sort((a, b) => a.priority - b.priority);
  }

  async createSalesRule(
    data: Omit<SalesRule, "id" | "createdAt" | "updatedAt">
  ): Promise<SalesRule> {
    const ts = new Date().toISOString();
    const rule: SalesRule = {
      id: this.nextRuleId++,
      ...data,
      createdAt: ts,
      updatedAt: ts,
    };
    this.salesRules.push(rule);
    return { ...rule };
  }

  async updateSalesRule(
    id: number,
    data: Partial<Omit<SalesRule, "id" | "createdAt">>
  ): Promise<SalesRule | null> {
    const idx = this.salesRules.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.salesRules[idx] = {
      ...this.salesRules[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return { ...this.salesRules[idx] };
  }

  async deleteSalesRule(id: number): Promise<boolean> {
    const idx = this.salesRules.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.salesRules.splice(idx, 1);
    return true;
  }
}

// ============================================================
// ファクトリ（module-level singleton）
// ============================================================

let _store: ChatDataStore | null = null;

/**
 * ChatDataStore のシングルトンを返す。
 *
 * 【移行時の差し替えポイント】
 * Cloudflare Workers では env.DB（D1Database）を受け取って
 * `new D1ChatDataStore(env.DB)` を返すように変更する。
 * chat-handler は dataStore を引数で受け取れるため、
 * Workers 側でインスタンスを生成して注入するだけでよい。
 */
export function getDataStore(): ChatDataStore {
  if (!_store) {
    _store = new InMemoryDataStore();
  }
  return _store;
}

/*
 * ============================================================
 * D1 実装の差し替え例（Phase 2 で寺園さんが実装）
 * ============================================================
 *
 * export class D1ChatDataStore implements ChatDataStore {
 *   constructor(private db: D1Database) {}
 *
 *   async listActiveTopics(): Promise<Topic[]> {
 *     const result = await this.db
 *       .prepare("SELECT * FROM topics WHERE enabled = 1")
 *       .all<Topic>();
 *     return result.results;
 *   }
 *
 *   // ... 他のメソッドも同様に D1 の SQL で実装
 * }
 */
