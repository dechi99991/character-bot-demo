# character-bot-demo - 進捗状況

## 進行中

（現時点ではなし）

---

## TODO

- [ ] **dechi さんと指示書-v2.md の事実確認** `[triaged: 直接実行 / sonnet / low]` 優先度: 高
  - `指示書-v2.md` の Next.js + Vercel AI SDK + Gemini 2.5 Pro 構成記述が事実通りか dechi さんにレビュー依頼
  - 不正確な箇所があれば PR で修正
- [ ] **docs/operation-guide.md の更新** `[triaged: 計画→承認→実行 / sonnet / medium]` 優先度: 中
  - 現状は Streamlit Cloud 前提で書かれている（最終更新 2026-03-13）
  - Vercel + Gemini API 構成に書き換え（指示書-v2.md と整合）
  - ランニングコスト見積も Vercel Hobby + Gemini 2.5 Pro に更新
- [ ] **docs/client-qa-*.md の確認** `[triaged: 直接実行 / sonnet / low]` 優先度: 中
  - `client-qa-01.md` / `client-qa-02-maintenance.md` も Streamlit 前提の可能性
  - 確認 → 必要なら更新
- [ ] **指示書.md は変更しない** `[継続]` 優先度: -
  - **史料として保持**。変更が必要になった場合は dechi さんと事前合意
  - v1 から v2 への移行経緯を残すための重要史料

---

## 〇〇待ち

（現時点ではなし）

---

## 保留

（現時点ではなし）

---

## 申し送り（dechi99991 さん向け）

### 2026-04-30 — PR #1 マージ報告

- **PR #1 を 2026-04-30 02:41 (UTC) に長瀬側で squash merge しました**（commit `f013271`）
  - dechi さんのレビュー前マージとなりすみません。事後確認をお願いします
  - 主要追加物: `CLAUDE.md` / `CONTRIBUTING.md` / `progress-docs/` / `指示書-v2.md` / `.gitignore` 追記
- **特に確認いただきたい点**:
  1. `指示書-v2.md` の技術構成記述（Next.js 15 + Vercel AI SDK + Gemini 2.5 Pro）が事実通りか
  2. `CLAUDE.md` の「⚠️ 要確認事項」記述が現状認識と合っているか
- **不正確な箇所があれば**: PR またはこの `progress-docs/PROGRESS.md` でお知らせください。修正対応します
