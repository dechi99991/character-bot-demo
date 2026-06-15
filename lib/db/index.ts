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
    keywords: "疲れた,忙しい,休みたい,しんどい",
    recommendProduct: "深呼吸のほうじ茶 (Midnight Roaster)",
    recommendMessage:
      "限界まで焙煎した香ばしさが「心のスイッチをオフにする」感覚を引き出す。ゆっくり深呼吸しながら飲むと効果的。",
    enabled: true,
    priority: 10,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    keywords: "集中したい,頑張りたい,エナドリ,覚醒",
    recommendProduct: "静かなる覚醒の煎茶 (Silent Awakening)",
    recommendMessage:
      "無理にテンションを上げるのではなく、霧深い山奥のような静かなクリアさをもたらす。アイドリング状態で走る感覚。",
    enabled: true,
    priority: 20,
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
