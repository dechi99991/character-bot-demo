# character-bot-demo - 進捗状況

## 進行中

- [ ] **feature/tea-room-ui ブランチ** — commit済み・push ブロック中
  - `gh auth refresh -s workflow` + `git push` で解消（9コミット分が溜まっている）
  - PR作成は未実施

---

## TODO

### 直近（feature/tea-room-ui ブランチ）
- [ ] `gh auth refresh -s workflow` → `git push` → CI確認 → PR作成 → mainマージ
- [ ] **藤井さんへ `docs/handoff-to-fujii.md` を送付** — 実商品データ入手が最優先
  - 必要データ: カフェイン量 / 味プロファイル / 正式ShopifyURL / 産地・農園・品種
- [ ] `ADMIN_PASSWORD` を .env.local / Vercel env に設定（管理API認証有効化）
- [ ] `.env.local` に `MOCK_CHAT=true` を追加（ローカルモックデモ用）

### Phase 2（実商品データ入手後）
- [ ] **seed商品4点を実データで上書き** — ダミー属性値を実態に置き換え
- [ ] **`appendConversationLog` の no-op を実装に変える** — 会話ログDB実装（REQ-404）
- [ ] **モバイルでキャラクターを何かしら表示** — DLSビジュアル納品後にレイアウト確定（REQ-108）
- [ ] **モック動作中バッジ** — `MOCK_CHAT=true` 時に画面上部に小さく表示（REQ-206）
- [ ] **コード側カフェインフィルタ** — 二重防御。現状はプロンプト制御のみ（handoff Q1参照）

### 中期（寺園さんとの相談）
- [ ] **ホスティング方針確定** — Vercel継続 or Cloudflare Workers（Q20）
- [ ] **本番認証方式** — Cloudflare Access or Basic（Q21）
- [ ] **レート制限本番化** — 閾値・共有ストア確定（Q22、AI独断変更禁止）
- [ ] **Shopify連携** — API直接 or 非同期アップロード（Q19、方式確定後実装）

### 継続保留
- [ ] **寺園さんとの §13 未決事項の詰め** — 認証・CORS・sessionId発番元・D1確定等
- [ ] **指示書-v2.md の更新** — Cloudflare Workers 移行方針・DB 構成を反映
- [ ] **docs/operation-guide.md の更新** — Streamlit 前提を Vercel+Gemini に書き換え
- [ ] **指示書.md は変更しない** — 史料として保持

---

## デザイアドライン社への SVG 差し替え手順

| アセット | ファイルパス | 差し替え方法 |
|---|---|---|
| キャラクター | `public/assets/character.svg` | SVG ファイルをアップロードして上書き |
| 背景 | `GridBackground.tsx` 内 → `public/assets/background.svg`（将来） | 現状はCSSグリッド。SVG納品後 `SvgBackground` に差し替え |
| 急須（デモ） | `public/assets/objects/teapot.svg` | SVG ファイルをアップロードして上書き |
| 新オブジェクト追加 | `components/SceneObjects.tsx` + SVG | SCENE_OBJECTS に1エントリ追加 + SVG 配置（コード変更必要） |

---

## 〇〇待ち

（現時点ではなし）

---

## 保留

- **PR #2（post-merge-handoff）** — close 済み（PR #3 で上書き申し送り済みのため）

---

## 申し送り（dechi99991 さん向け）

### 2026-06-22 — 茶室チャットBot UI リニューアル・セキュリティ強化・SVGアセット構造

- **feature/tea-room-ui ブランチ** — commit 済み（push は `gh auth refresh -s workflow` 待ち）
  - 主要追加物: UIリニューアル / MOCK_CHATモード / セキュリティ強化 / SVGアセット構造
- **特に確認いただきたい点**:
  1. `npm run dev` → `MOCK_CHAT=true` でデモ動作確認
  2. `/public/assets/character.svg` を差し替えてキャラクター変更できること確認
  3. 急須SVG（左下）が浮遊アニメーションで表示されること確認

### 2026-06-15 — Cloudflare Workers 移行準備 + 管理画面プロトタイプ

- **PR #3 を 2026-06-15 に長瀬側でマージしました**（`feature/cloudflare-migration-prep`）
  - 主要追加物: 要件定義書 / 疎結合リファクタリング / CRUD API / 管理画面プロトタイプ
- **特に確認いただきたい点**:
  1. `docs/requirements-for-terazono.md` §13 の未決事項（認証・CORS・D1 等）
  2. 管理画面 `/admin` の動作確認（`npm run dev` → http://localhost:3000/admin）
- PR #2 は本 PR で上書き申し送り済みのためクローズしました

### 2026-04-30 — PR #1 マージ報告

- **PR #1 を 2026-04-30 02:41 (UTC) に長瀬側で squash merge しました**（commit `f013271`）
  - 主要追加物: `CLAUDE.md` / `CONTRIBUTING.md` / `progress-docs/` / `指示書-v2.md`
