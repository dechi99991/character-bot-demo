# character-bot-demo - 進捗状況

## 進行中

### Claude Code 管理基盤 PR #1 のレビュー・マージ待ち

- **PR**: https://github.com/dechi99991/character-bot-demo/pull/1
- **ブランチ**: `feature/add-claude-management`
- **状態**: dechi99991（オーナー）のレビュー・マージ待ち
- **内容**:
  - Claude Code 管理基盤（CLAUDE.md / CONTRIBUTING.md / progress-docs/ / .gitignore）を後付け
  - **指示書-v2.md 新設**: 旧 `指示書.md`（Streamlit 想定）と現実装（Next.js）の乖離を解消するため、史料保持 + v2 新設アプローチを採用
- **次セッションでやること**:
  1. PR #1 がマージ済みかを最初に確認（`gh pr view 1 --json state`）
  2. マージ済みなら下記 TODO に着手
  3. 未マージなら dechi さんに状況確認

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

- **PR #1 マージ** — dechi99991（オーナー）の判断待ち。マージされ次第、上記 TODO に着手

---

## 保留

（現時点ではなし）
