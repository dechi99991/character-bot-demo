# 実装計画: A/B/C — DB実装・管理CRUD API・ログエンドポイント

## Context

ヒヤリングを経て、Cloudflare Workers 移行を見据えた疎結合設計（lib/ 層）が完成した。
次のステップは「動くサンプル」を Vercel 上で作ること。

- **A**: StubDataStore（空配列返し）を Seed + In-Memory 実装に置き換え、/chat で動的コンテキスト注入が動く状態にする
- **B**: 話題・営業ルールの管理 CRUD API を Next.js API Route で実装（寺園さんへの API 契約のサンプル）
- **C**: /log エンドポイント実装（会話ログ書き込み口）

**DB選択（In-Memory + Seed）**: 追加パッケージゼロ、即デプロイ可能。Vercel はサーバーレスだが、同一 warm インスタンス内では module-level singleton が生きるため CRUD の動作確認は可能。冷起動でリセットされることは注記する（Cloudflare D1 実装は寺園さんが担当）。

---

## 変更ファイル一覧

| ファイル | 区分 | 内容 |
|---------|------|------|
| `lib/db/index.ts` | 変更 | ChatDataStore に CRUD メソッド追加、InMemoryDataStore 実装、Seed データ |
| `app/api/topics/route.ts` | 新規 | GET（一覧）+ POST（作成） |
| `app/api/topics/[id]/route.ts` | 新規 | PUT（更新）+ DELETE（削除） |
| `app/api/sales-rules/route.ts` | 新規 | GET + POST |
| `app/api/sales-rules/[id]/route.ts` | 新規 | PUT + DELETE |
| `app/api/log/route.ts` | 新規 | POST（会話ログ書き込み） |

---

## 詳細設計

### 1. `lib/db/index.ts` の変更

**ChatDataStore インターフェース拡張（既存3メソッドは維持）:**

追加するメソッド:
- `listAllTopics()` / `createTopic()` / `updateTopic()` / `deleteTopic()`
- `listAllSalesRules()` / `createSalesRule()` / `updateSalesRule()` / `deleteSalesRule()`

**InMemoryDataStore（StubChatDataStore を置き換え）:**
- `Topic[]` と `SalesRule[]` を module-level の配列で保持
- Seed データあり（話題2件、営業ルール2件）
- `getDataStore()` は module-level singleton（同一 warm インスタンス内は状態を保持）
- `StubChatDataStore` はコメントで残す（D1 実装の差し替えポイントとして）

**Seed データ:**
- 話題①: `梅雨の過ごし方` / 話題②: `暑気払いの水出し緑茶`
- ルール①: キーワード `疲れた,忙しい,休みたい` → Midnight Roaster（深呼吸のほうじ茶）
- ルール②: キーワード `集中したい,頑張りたい,エナドリ` → Silent Awakening（静かなる覚醒の煎茶）

### 2. API Route パターン（全 route.ts 共通）

Next.js 15 では動的ルートの `params` は Promise:

```typescript
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  // ...
}
```

エラーレスポンス統一:
- 404: `NextResponse.json({ error: "Not Found" }, { status: 404 })`
- 400: `NextResponse.json({ error: "Bad Request" }, { status: 400 })`
- 204 DELETE 成功: `new Response(null, { status: 204 })`

バリデーション（最小限）: タイトル・本文・キーワード・商品名が空文字でないこと

### 3. `/api/log/route.ts`

- POST のみ（GET は Phase 4）
- body: `ConversationLogInput`（`lib/db/index.ts` の既存型）
- 常に `{ ok: true }` を返す（DB書き込み失敗してもチャットは止めない）

---

## 既存コードへの影響

- `lib/chat-handler.ts`: `listActiveTopics()` / `listActiveSalesRules()` しか呼ばないため影響なし
- `app/api/chat/route.ts`: 変更なし
- `lib/context-builder.ts`: 変更なし

---

## 注記

- **データ永続化**: In-Memory のため Vercel 冷起動でリセット。動作確認用プロトタイプとして割り切る
- **CORS**: Next.js 同一オリジン内のため今回は不要。管理画面が別オリジンになる際（Phase 3）に追加
- **認証**: 今回は実装しない。API Key 等は寺園さんが D1 移行時に追加

---

## 検証方法

```bash
npm run dev

# B: 話題CRUD
curl -X POST http://localhost:3000/api/topics \
  -H "Content-Type: application/json" \
  -d '{"title":"夏の水出し","body":"冷たい緑茶は体を冷やす","enabled":true}'
curl http://localhost:3000/api/topics
curl -X PUT http://localhost:3000/api/topics/1 \
  -H "Content-Type: application/json" -d '{"enabled":false}'
curl -X DELETE http://localhost:3000/api/topics/1

# C: ログ
curl -X POST http://localhost:3000/api/log \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","role":"user","content":"こんにちは"}'

# A: /chat で seed データが動的コンテキストに注入されていること（ブラウザで確認）
```
