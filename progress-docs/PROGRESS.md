# character-bot-demo - 進捗状況

## 進行中

- [ ] **feature/tea-room-ui ブランチ** — commit済み・push ブロック中
  - `gh auth refresh -s workflow` + `git push` で解消
  - PR作成は未実施

---

## TODO

### 直近（feature/tea-room-ui ブランチ）
- [ ] `gh auth refresh -s workflow` → `git push` → CI確認
- [ ] PR作成 → mainへマージ
- [ ] `ADMIN_PASSWORD` を .env.local / Vercel env に設定（管理API認証有効化）
- [ ] rate limitを本番化前にUpstash等共有ストアへ切り替え（§8j）
- [ ] `.env.local` に `MOCK_CHAT=true` を追加（ローカルモックデモ用）
  - `echo "MOCK_CHAT=true" >> .env.local`

### 中期
- [ ] **寺園さんとの §13 未決事項の詰め** `[triaged: 計画→承認→実行 / sonnet / medium]` 優先度: 高
  - 認証方式（Cloudflare Access 推奨）・CORS 許可オリジン・sessionId 発番元・D1 確定等
  - `docs/requirements-for-terazono.md` §13 参照
- [ ] **指示書-v2.md の更新** `[triaged: 直接実行 / sonnet / low]` 優先度: 中
  - 現在は「Next.js + Vercel」前提。Cloudflare Workers 移行方針・DB 構成を反映する
- [ ] **docs/operation-guide.md の更新** `[triaged: 計画→承認→実行 / sonnet / medium]` 優先度: 中
  - 現状は Streamlit Cloud 前提（最終更新 2026-03-13）
  - Vercel + Gemini API 構成に書き換え（指示書-v2.md 更新後に実施）
- [ ] **docs/client-qa-*.md の確認** `[triaged: 直接実行 / sonnet / low]` 優先度: 中
  - `client-qa-01.md` / `client-qa-02-maintenance.md` も Streamlit 前提の可能性あり
- [ ] **指示書.md は変更しない** `[継続]` 優先度: -
  - 史料として保持。変更が必要な場合は dechi さんと事前合意

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
