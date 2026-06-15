# tayumano キャラクターBot 要件定義書（寺園さん向け）

- 作成: 長瀬（PM）
- 最終更新: 2026-06-15
- 対象読者: 寺園さん（設計〜実装担当）
- ステータス: ドラフト（未決事項は §13 参照）

> 本書は Cloudflare Workers 移行後の新システムの要件です。
> 現行（Next.js + Vercel）は移行のベースであり、本書の Phase 1 で移植します。
> 確定度を明示するため、各所に **【確定】/【推奨】/【検討中】/【要決定】** のタグを付けています。

---

## 1. プロジェクト概要・背景・ゴール

### 1.1 概要
tayumano（お茶ブランド）向けのキャラクターチャットBot。キャラクター「チャ・レノン（お茶好きの兄ちゃん）」が、原作テキスト（ブランドストーリー・お茶知識）をベースにユーザーの会話へ応答する Web チャットシステム。

### 1.2 背景・経緯
- 現状: Next.js 15 + Vercel AI SDK + Gemini 2.5 Pro で動くシンプルなチャットアプリ（Vercel ホスト）。
- 課題: レイテンシ改善が必要。運用者（藤井さんら）が話題・営業ルールを自分で更新できない（現状はコード直書き）。
- 今後: **Cloudflare Workers への全面移行** + **DB 連携** + **運用者向け管理画面** + **フロントエンド全面作り直し（DLS デザイン）**。

### 1.3 ゴール
1. レイテンシ改善（Cloudflare エッジでの実行）。
2. 話題・営業ルールを運用者が管理画面から CRUD できる。
3. 会話ログを蓄積し、将来の分析・マーケティングに繋げる。
4. フロントエンド（チャット画面）と API を完全分離（疎結合）し、DLS デザインの実装を寺園さんが自由に行える。

### 1.4 我々の提供範囲
**我々が提供するのは「API・DB・管理画面」。** フロントエンド（チャット画面）は DLS のデザインを寺園さんが実装し、本 API を別オリジンから叩く構成。

---

## 2. 体制・役割分担

| 役割 | 担当 |
|------|------|
| 要件定義・クライアント渉外・管理画面の叩き（ワイヤー） | 長瀬（PM） |
| 設計〜実装全般（フロント・バック・API・管理画面） | 寺園さん（受託） |
| フロントエンドデザイン | DLS（クライアント先方） |
| Cloudflare 契約 | クライアント（先方） |
| 話題・営業ルール追加（運用） | 藤井さん（たゆまの）・関係者 |

---

## 3. システムアーキテクチャ図

```
                          別オリジン（CORS必要）
  ┌────────────────────────────┐        ┌──────────────────────────────────────────┐
  │  チャット画面（フロント）       │        │      Cloudflare Workers（API本体）          │
  │  - DLS デザイン               │        │                                            │
  │  - 寺園さん実装                │ HTTPS  │  POST /chat   ── ストリーミング応答          │
  │  - Vercel AI SDK useChat 互換  │──────▶ │  POST /log    ── 会話ログ書き込み            │
  │    or 独自フェッチ              │ stream │  GET/POST/PUT/DELETE /topics      （管理用）│
  └────────────────────────────┘        │  GET/POST/PUT/DELETE /sales-rules （管理用）│
                                          │                                            │
  ┌────────────────────────────┐        │     ┌──────────────┐   ┌────────────────┐ │
  │  管理画面（運用者向け）         │ HTTPS  │     │ chat-handler │──▶│ Gemini 2.5 Pro │ │
  │  - 長瀬ワイヤー → 寺園実装      │──────▶ │     │ (コアロジック) │   │ @ai-sdk/google │ │
  │  - 藤井さんら + 開発側がアクセス │  認証   │     └──────┬───────┘   └────────────────┘ │
  │  - Cloudflare Pages/Workers    │        │            │ context-builder            │
  └────────────────────────────┘        │     ┌──────▼───────────────────────────┐  │
                                          │     │  Cloudflare D1 (SQLite)            │  │
                                          │     │   ① topics  ② sales_rules         │  │
                                          │     │   ④ conversation_logs              │  │
                                          │     └────────────────────────────────────┘  │
                                          │                                            │
                                          │  ③ キャラクター設定 = ファイルベース           │
                                          │     （リポジトリ内 character.ts。DB対象外）   │
                                          └──────────────────────────────────────────┘
                                                              ▲
                                                              │ 将来（Phase 4）
                                                   ┌──────────┴──────────┐
                                                   │  Shopify（商品情報）   │
                                                   │  バッチで ② に連携      │
                                                   └─────────────────────┘
```

**会話フロー（3段階）**
1. 雑談モード → ① 話題DB を参照してコンテキスト補強。
2. 営業モード → ② 営業ルールDB のキーワードマッチでレコメンド決定。
3. キャラクター設定（横断） → ③ ファイルベース設定が全会話に適用。

---

## 4. 技術スタック

| 領域 | 技術 | 確定度 | 補足 |
|------|------|--------|------|
| ランタイム | Cloudflare Workers | 【確定】 | 移行先 |
| DB | Cloudflare D1（SQLite） | 【推奨】 | Workers との相性◎。最終判断は寺園さん |
| LLM | Gemini 2.5 Pro（`@ai-sdk/google`） | 【確定】 | 現行から継続 |
| LLM 連携 | Vercel AI SDK（`ai` / `streamText`） | 【確定】 | Workers でも動作。ストリーミング互換のため継続 |
| 管理画面ホスト | Cloudflare Pages or Workers Sites | 【検討中】 | 寺園さん選定 |
| 管理画面フレームワーク | （寺園さん裁量） | 【検討中】 | React/Next など。CRUD が組めれば自由 |
| チャット画面（フロント） | DLS デザイン + 寺園さん実装 | 【確定（分離方針）】 | API と疎結合。技術は寺園さん裁量 |
| 認証（管理画面・API） | Cloudflare Access / API Key 等 | 【要決定】 | §11・§13 参照 |

> 注: Vercel AI SDK の `streamText` / `toDataStreamResponse()` は標準 `Request`/`Response` ベースのため Cloudflare Workers でも利用可能。現行コードはこの前提で疎結合化済み（§2 リファクタリング成果物、`lib/chat-handler.ts`）。

---

## 5. API 設計

### 5.1 エンドポイント一覧

| メソッド | パス | 用途 | 認証 | フェーズ |
|---------|------|------|------|---------|
| POST | `/chat` | チャット応答（ストリーミング） | 公開 or APIキー（要決定） | Phase 1 |
| POST | `/log` | 会話ログ書き込み | 公開 or APIキー（要決定） | Phase 2 |
| GET | `/topics` | ① 話題一覧 | 管理者 | Phase 3 |
| POST | `/topics` | ① 話題追加 | 管理者 | Phase 3 |
| PUT | `/topics/:id` | ① 話題編集 | 管理者 | Phase 3 |
| DELETE | `/topics/:id` | ① 話題削除 | 管理者 | Phase 3 |
| GET | `/sales-rules` | ② 営業ルール一覧 | 管理者 | Phase 3 |
| POST | `/sales-rules` | ② 営業ルール追加 | 管理者 | Phase 3 |
| PUT | `/sales-rules/:id` | ② 営業ルール編集 | 管理者 | Phase 3 |
| DELETE | `/sales-rules/:id` | ② 営業ルール削除 | 管理者 | Phase 3 |
| GET | `/logs` | ④ 会話ログ参照 | 管理者 | Phase 4（将来） |

### 5.2 リクエスト/レスポンス仕様（TypeScript 型定義）

型は現行リポジトリの `lib/db/index.ts` および `lib/context-builder.ts` の定義と整合させています（そのまま流用可）。

```typescript
// ---- 共通 ----
type ISODateString = string; // ISO 8601

// ---- POST /chat ----
// Vercel AI SDK の useChat が送出する形式と互換
interface ChatRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  // 任意: ログ紐付け用。フロント発番 or サーバ発番（要決定）
  sessionId?: string;
}
// レスポンス: text/event-stream（AI SDK Data Stream Protocol）
//   → §5.3 参照。JSON ではなくストリーム。

// ---- POST /log ----
interface LogRequest {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  mode?: "smalltalk" | "sales" | "unknown";
}
interface LogResponse {
  ok: boolean;
}

// ---- ① topics ----
interface Topic {
  id: number;
  title: string;     // 話題タイトル 例: "梅雨の過ごし方"
  body: string;      // 本文・補足。プロンプトに注入される
  enabled: boolean;  // 無効な話題はコンテキストに含めない
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
type TopicCreateRequest = Pick<Topic, "title" | "body" | "enabled">;
type TopicUpdateRequest = Partial<TopicCreateRequest>;

// ---- ② sales_rules ----
interface SalesRule {
  id: number;
  keywords: string;          // カンマ区切り 例: "疲れた,忙しい,休みたい"
  recommendProduct: string;  // 例: "Midnight Roaster"
  recommendMessage: string;  // レコメンドトーク。プロンプトに注入される
  enabled: boolean;
  priority: number;          // 複数マッチ時の優先度（小さいほど優先）
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
type SalesRuleCreateRequest = Pick<
  SalesRule,
  "keywords" | "recommendProduct" | "recommendMessage" | "enabled" | "priority"
>;
type SalesRuleUpdateRequest = Partial<SalesRuleCreateRequest>;

// ---- 一覧レスポンス共通 ----
interface ListResponse<T> {
  items: T[];
  total: number;
}
```

### 5.3 ストリーミング方式【確定】

- 現行は Vercel AI SDK の `streamText(...).toDataStreamResponse()` を使用。
- **フロント（useChat）が解釈する Data Stream Protocol を維持すること。** フロントを独自実装する場合も、このワイヤフォーマット（`text/event-stream` ベースの AI SDK 形式）に合わせれば useChat 互換ライブラリがそのまま使える。
- Workers でも `toDataStreamResponse()` の返り値（標準 `Response`）をそのまま返せばよい。コアロジックは `lib/chat-handler.ts` の `handleChat()` に集約済み。

### 5.4 CORS 設定【確定（方針）/ 値は要決定】

フロント・管理画面は API と別オリジンから叩くため、Workers 側で CORS ヘッダを返す必要がある。

```
Access-Control-Allow-Origin: <フロントのオリジン>   # ワイルドカード(*)は避け、許可ドメインを列挙
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```
- プリフライト（`OPTIONS`）に 204 を返すハンドラを用意。
- 許可オリジンの具体値は §13【要決定】（DLS フロントの本番/プレビュー URL、管理画面 URL）。

### 5.5 認証方式【要決定】

- `/chat`・`/log`（公開向け）: ボット濫用対策が必要。案として
  - 案a: Cloudflare Turnstile（CAPTCHA）+ レート制限。
  - 案b: フロントに埋め込む短命トークン。
  - 案c: 当面はオリジン制限（CORS）+ Workers レート制限のみ。
- `/topics`・`/sales-rules`（管理向け）: 管理者のみ。案として
  - 案a: Cloudflare Access（Zero Trust。Google ログイン等。**推奨**：藤井さんら非エンジニアでも運用しやすい）。
  - 案b: API Key（ヘッダ `Authorization: Bearer <key>`）。
- 最終決定は §13。

---

## 6. DB 設計（Cloudflare D1 想定）【推奨】

> D1 は SQLite ベース。以下はそのまま D1 マイグレーションに使える DDL。
> `③ キャラクター設定` はファイルベースのため **テーブルなし**。

```sql
-- ① 話題DB（雑談モードのコンテキスト補強。運用者がフォーム代替の管理画面で随時更新）
CREATE TABLE topics (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  body       TEXT    NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,   -- 0/1（SQLite に boolean 型なし）
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_topics_enabled ON topics(enabled);

-- ② 営業ルールDB（キーワード×レコメンド。藤井さんが管理画面で追加。Shopify連携先）
CREATE TABLE sales_rules (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  keywords          TEXT    NOT NULL,        -- カンマ区切り 例: "疲れた,忙しい"
  recommend_product TEXT    NOT NULL,        -- 例: "Midnight Roaster"
  recommend_message TEXT    NOT NULL,        -- レコメンドトーク
  enabled           INTEGER NOT NULL DEFAULT 1,
  priority          INTEGER NOT NULL DEFAULT 100,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sales_rules_enabled  ON sales_rules(enabled);
CREATE INDEX idx_sales_rules_priority ON sales_rules(priority);

-- ④ 会話ログ（書き込みのみ。参照は将来フェーズ）
CREATE TABLE conversation_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT    NOT NULL,               -- 会話セッション識別子
  role       TEXT    NOT NULL,               -- 'user' | 'assistant'
  content    TEXT    NOT NULL,
  mode       TEXT,                           -- 'smalltalk' | 'sales' | 'unknown'（任意）
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_logs_session ON conversation_logs(session_id);
CREATE INDEX idx_logs_created ON conversation_logs(created_at);
```

補足:
- `enabled` は SQLite の慣習で INTEGER(0/1)。アプリ層で boolean へ変換（`lib/db` 実装で吸収）。
- Shopify 連携（Phase 4）では `sales_rules` に商品由来の列を追加 or 別テーブル化を検討（§10）。

---

## 7. チャットの動的コンテキスト構築ロジック

会話のたびに以下の手順でシステムプロンプトを組み立てる。実装は `lib/chat-handler.ts` → `lib/context-builder.ts` → `lib/character.ts` に分離済み。

```
[1] handleChat() が ChatDataStore から取得
        ├ ① listActiveTopics()      → Topic[]（enabled のみ）
        └ ② listActiveSalesRules()  → SalesRule[]（enabled のみ、priority 昇順）
              ※ 取得失敗時は空配列にフォールバック（チャットは止めない）

[2] buildDynamicSection(context) が注入文字列を生成
        ① 話題  → 「【最近の話題】- title: body ...」
        ② ルール → 「【営業レコメンド指針】- もし [keywords] が関係していたら
                     『product』を message の趣旨で自然に勧める ...」
        ※ どちらも空なら空文字（既存プロンプトを汚さない）

[3] buildCharacterSetting(context) が合成
        CHARACTER_SETTING_BASE（不変・審査済み）
          + "\n" + 動的セクション（あれば）

[4] streamText({ system: 合成結果, messages }) → Gemini → ストリーミング応答
```

設計意図:
- **キーワードマッチ判定は LLM に委ねる**（プロンプト内の指示として営業ルールを渡す）。サーバ側で機械的にマッチさせる方式（後述 §13 で要相談）も可能だが、初期は自然言語の柔軟性を優先。
- ① と ② の注入は「ベース文字列を書き換えず末尾追記」する設計。審査済みの核（S1-S4 等）を壊さないため。

---

## 8. キャラクター設定管理（ファイルベース運用）

- ③ キャラクター設定は **DB ではなくリポジトリ内ファイル**（`lib/character.ts`）で管理。更新は開発側（コード変更 → デプロイ）。
- 理由: 口調・プロンプト・S1-S4（コンプライアンス）は審査・テストを伴う重要資産であり、運用者が画面から気軽に変えるべきではない。バージョン管理（Git）と相性が良い。
- 構成:
  - `CHARACTER_SETTING_BASE` … 審査済みの固定プロンプト。**一字一句変更禁止**。
  - `buildCharacterSetting(context)` … ベースに DB①② の動的セクションを合成して返す関数。
  - `CHARACTER_SETTING` … 後方互換用（動的なし＝現行と同一出力）。
- Workers 移行後もこのファイルをバンドルに含めればよい（D1 不要）。

---

## 9. 管理画面要件（叩き台）

> 長瀬がワイヤーを作成。以下は機能・画面の叩き台。

### 9.1 機能一覧
- ログイン（認証。§5.5・§13）。
- ① 話題: 一覧 / 追加 / 編集 / 削除 / 有効・無効トグル。
- ② 営業ルール: 一覧 / 追加 / 編集 / 削除 / 有効・無効トグル / 優先度設定。
- （将来）④ 会話ログ: 閲覧・検索・エクスポート。

### 9.2 画面一覧
| 画面 | 内容 |
|------|------|
| ログイン | 認証 |
| ダッシュボード | 件数サマリ・最近の更新 |
| 話題一覧 | テーブル表示・検索・有効無効フィルタ |
| 話題編集 | title / body / enabled のフォーム |
| 営業ルール一覧 | テーブル表示・優先度ソート |
| 営業ルール編集 | keywords / recommendProduct / recommendMessage / priority / enabled のフォーム |
| （将来）会話ログ | 一覧・検索 |

### 9.3 利用者
- 藤井さん（たゆまの）ら運用関係者 + 開発側。**Google フォームは不採用**、自前管理画面で代替。

---

## 10. Shopify 連携（将来 = Phase 4・概要のみ）

- 目的: Shopify の商品情報を ② 営業ルールDB に繋ぎ込み、レコメンド対象を最新の商品に保つ。
- 方式: バッチ更新（定期 or Webhook）。Shopify Admin API → 商品取得 → `sales_rules`（or 商品マスタ別テーブル）へ upsert。
- 検討事項: 商品マスタを独立テーブルにし、`sales_rules` から FK 参照する正規化を検討（手動ルールと自動商品の混在を整理するため）。
- 別案件として「会話ログ分析・マーケティング」も将来想定（④ の蓄積が前提）。

---

## 11. セキュリティ考慮事項

| 項目 | 対策 |
|------|------|
| プロンプトインジェクション | システムプロンプト S1 で対策済み（脱獄命令をはぐらかす）。`CHARACTER_SETTING_BASE` に内包。**この文字列を変更しないこと**。 |
| 他社ブランド言及 | S2 で禁止（プロンプト）。 |
| 薬機法・断定表現 | S3 で回避（プロンプト）。 |
| 個人情報 | S4 で記憶・復唱せず警告。会話ログ保存時も PII の扱いに注意（§13 でマスキング方針を要決定）。 |
| CORS | 許可オリジンを列挙（ワイルドカード禁止）。§5.4。 |
| API 認証 | 管理 API は認証必須。公開 API はレート制限・Turnstile 等。§5.5。 |
| データ保護 | D1 へのアクセスは Workers 経由のみ。管理 API は認証ゲート必須。 |
| シークレット | Gemini API キーは Workers Secret（`wrangler secret`）で管理。コード・リポジトリに置かない。 |
| レート制限 | Cloudflare WAF / Rate Limiting でボット濫用と LLM コスト暴騰を防ぐ。 |

---

## 12. フェーズ計画

| Phase | 内容 | 主な成果物 |
|-------|------|-----------|
| **Phase 1: 基本チャットAPI** | 現行ロジックを Workers へ移植。`/chat` ストリーミング。CORS。D1 なしでも動く（スタブ）。 | Workers 版 `/chat`、CORS、デプロイ |
| **Phase 2: DB連携** | D1 構築（① topics ② sales_rules ④ logs）。`lib/db` を D1 実装に差し替え。`/log` 実装。動的コンテキスト注入を有効化。 | D1 スキーマ、`D1ChatDataStore`、`/log` |
| **Phase 3: 管理画面** | ①② の CRUD API + 管理画面 UI。認証。藤井さんら運用開始。 | `/topics`・`/sales-rules` API、管理画面、認証 |
| **Phase 4: Shopify等** | Shopify バッチ連携、会話ログ参照・分析。 | Shopify 連携、`/logs`、分析基盤 |

> Phase 1 は §「リファクタリング成果物」により移植容易化済み。`handleChat()` をそのまま Workers の fetch ハンドラから呼べばよい。

---

## 13. 未決事項・要確認事項リスト

| # | 項目 | 区分 | 決定者（想定） |
|---|------|------|--------------|
| 1 | 公開 API（/chat, /log）の濫用対策（Turnstile / トークン / CORS のみ） | 認証 | 寺園さん + 長瀬 |
| 2 | 管理 API・管理画面の認証方式（Cloudflare Access 推奨 / API Key） | 認証 | 寺園さん + クライアント |
| 3 | CORS 許可オリジンの具体値（DLS フロント本番/プレビュー、管理画面 URL） | CORS | DLS + 寺園さん |
| 4 | `sessionId` の発番元（フロント or サーバ） | API | 寺園さん |
| 5 | 営業ルールのマッチ判定を LLM 委譲のままにするか、サーバ側機械マッチも併用するか | ロジック | 寺園さん + 長瀬 |
| 6 | 会話ログの PII マスキング方針（S4 該当情報の保存可否） | セキュリティ | 長瀬 + クライアント |
| 7 | D1 採用の最終確定（代替: KV + 外部 DB 等） | DB | 寺園さん |
| 8 | 管理画面のフレームワーク・ホスト（Pages / Workers Sites） | 技術 | 寺園さん |
| 9 | Gemini API のレート・コスト上限とフォールバック | 運用 | 長瀬 + 寺園さん |
| 10 | Shopify 連携の商品データモデル（sales_rules 拡張 or 別テーブル） | DB | 寺園さん（Phase 4） |

---

## 付録: 現行リポジトリのリファクタリング成果物

Phase 1 の移植を容易にするため、現行 Next.js コードを「フレームワーク非依存のコア + 薄いアダプター」に分離済み。Workers 移行時はコア（`lib/`）をそのまま流用できる。

| ファイル | 役割 |
|---------|------|
| `lib/character.ts` | ③ 静的キャラ設定（不変ベース + `buildCharacterSetting()`） |
| `lib/context-builder.ts` | ①② → プロンプト注入文字列の生成。`CharacterContext` 型 |
| `lib/db/index.ts` | DB アクセス抽象 IF（`ChatDataStore`）+ スタブ + ドメイン型。D1 実装の差し替え口 |
| `lib/chat-handler.ts` | フレームワーク非依存のコア（`handleChat()`）。`streamText` 呼び出し |
| `app/api/chat/route.ts` | Next.js 用の薄いアダプター（`handleChat` を呼ぶだけ） |

移行手順の要点:
1. `lib/db/index.ts` に `D1ChatDataStore`（D1 実装）を追加し、`getDataStore()` を差し替え or `handleChat({ dataStore })` で注入。
2. Workers の `fetch` ハンドラを書き、`POST /chat` で `handleChat({ messages })` を呼ぶ。
3. CORS ヘッダと `OPTIONS` ハンドラを Workers 側で付与。
4. Gemini API キーを Workers Secret に設定。
