/**
 * DB アクセス抽象レイヤー
 *
 * 【Why】
 * Cloudflare Workers + D1 への移行を見据え、ビジネスロジックを
 * 特定のDB実装から切り離す。チャットのコアロジック（chat-handler）は
 * この `ChatDataStore` インターフェースにのみ依存する。
 *
 * 現状はスタブ（空データ）。D1 への接続は `D1ChatDataStore` のような
 * 実装クラスをこのファイルに追加し、`getDataStore()` の返り値を
 * 差し替えるだけで移行が完了する設計。
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
   * マッチ対象キーワード（カンマ区切り等で複数想定）。
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
 * チャットが必要とするデータアクセスの抽象。
 * Next.js 実装・D1 実装・テスト用モックがこのIFを満たす。
 */
export interface ChatDataStore {
  /** ① 有効な話題を取得（雑談コンテキスト用） */
  listActiveTopics(): Promise<Topic[]>;
  /** ② 有効な営業ルールを取得（レコメンド判定用） */
  listActiveSalesRules(): Promise<SalesRule[]>;
  /** ④ 会話ログを1件書き込む（失敗してもチャット本体は止めない想定） */
  appendConversationLog(log: ConversationLogInput): Promise<void>;
}

// ============================================================
// スタブ実装（現状の既定）
// ============================================================

/**
 * 空データを返すスタブ実装。
 * DB未接続でも現行のチャット動作が壊れないことを保証する。
 */
export class StubChatDataStore implements ChatDataStore {
  async listActiveTopics(): Promise<Topic[]> {
    return [];
  }

  async listActiveSalesRules(): Promise<SalesRule[]> {
    return [];
  }

  async appendConversationLog(_log: ConversationLogInput): Promise<void> {
    // no-op: 将来 D1 への INSERT に差し替える
    return;
  }
}

// ============================================================
// ファクトリ
// ============================================================

/**
 * 現在の実行環境に応じた ChatDataStore を返す。
 *
 * 【移行時の差し替えポイント】
 * Cloudflare Workers では env.DB（D1Database）を受け取って
 * `new D1ChatDataStore(env.DB)` を返すように変更する。
 * 呼び出し側（chat-handler）はこの関数のシグネチャに依存しないよう、
 * 引数で ChatDataStore を受け取る設計にしてある。
 */
export function getDataStore(): ChatDataStore {
  return new StubChatDataStore();
}
