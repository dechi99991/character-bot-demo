# character-bot-demo - セッションログ

<!-- セッションごとに「何を・なぜ・どう考えたか」を追記する -->
<!-- /session-end 実行時に最上部へ新エントリを追記 -->

## 2026-04-29 セッション — Claude Code 管理基盤の後付け + 指示書 v2 新設

> **このセッションは claude-project-base ハーネスから実施**: PM（長瀬）が claude-project-base の init-collab パターンを使って後付けセットアップを行った。本リポジトリ内では作業していない（PR #1 経由で取り込み）。

### 目的
- claude-project-base ハーネスの管理基盤（CLAUDE.md / progress-docs/ / CONTRIBUTING.md / `.claude/` 設定）を後付けで整備
- 指示書.md（Streamlit 想定）と実装（Next.js）の乖離を解消

### 実施内容
1. **管理基盤の後付け**: claude-project-base/templates/ から CLAUDE.md / CONTRIBUTING.md / progress-docs/ 6ファイル + .claude/ 設定を展開
2. **`.gitignore` に `.claude/` 追記**: 各自のローカル Claude Code 設定を gitignore で隔離
3. **プレースホルダー置換**: `{{PROJECT_NAME}}=character-bot-demo` / `{{PM_NAME}}=長瀬` / `{{DEV_NAME}}=dechi99991`
4. **指示書 v2 新設** (`指示書-v2.md`): 現行の Next.js + Vercel AI SDK + Gemini 2.5 Pro 構成を反映。旧 `指示書.md`（Streamlit）は史料として変更せず保持
5. **CLAUDE.md に「⚠️ 要確認事項」セクション追加**: 指示書 v1 と実装の不整合を明記

### 設計変遷
- **当初検討**: 実装優先で指示書.md を Next.js 構成に書き換える案
- **転換契機**: ユーザー（PM）から「v1 は史料として残し、新指示書を別ファイル（v2）として作成したい」との指示
- **採用方針**: 史料保持 + v2 新設。v1→v2 の変更点比較表を v2 末尾に記載
- **根拠**: git log で `8cabfd9 migrate from Streamlit to Next.js with Vercel AI SDK` を確認 → 移行経緯が明示的にあり、史料として価値がある

### 学び
- **仕様/実装乖離の解消パターン**: git log に明示的な migrate コミットがある場合、実装が真。仕様は史料保持 + 新仕様を別ファイルで作るのが情報捨象を避ける最善策
- **後付け管理基盤の境界**: `.claude/` を `.gitignore` 対象にすることで、コードオーナー（dechi99991）の環境を汚さずに PM 側の Claude Code セッション管理が可能

### 結論・次ステップ
- PR #1 提出済み: https://github.com/dechi99991/character-bot-demo/pull/1
- 次は dechi99991（オーナー）のレビュー・マージ待ち
- マージ後の TODO は `progress-docs/PROGRESS.md` 進行中・TODO 参照

### ブランチ
- `feature/add-claude-management` — 管理基盤 + 指示書-v2.md + 申し送り（PROGRESS / SESSION-LOG / INSIGHTS）


<!-- エントリ雛形（コピーして使う）

## YYYY-MM-DD セッション — [タイトル（1行で）]

### 目的
- 何をしようとしていたか

### 実施内容
1. **[作業名]**: 概要

### 設計変遷
- 検討した代替案（A案 / B案 / C案）と却下理由
- スコープや方針が途中で変わった箇所とその契機
- ユーザーからの指摘・軌道修正

### 学び
- 他セッションにも適用できる一般化された原則

### 結論・次ステップ
- 次回着手予定

### ブランチ
- `feature/xxx` — コミット概要

-->

<!-- 「設計変遷」と「学び」の区別:
  - 設計変遷: そのセッション固有の設計議論（1回限りの文脈）
  - 学び: 他セッションにも適用できる一般化された原則
  最終結論だけを残すと「なぜこの設計に至ったか」を将来復元できない（情報の捨象禁止原則）。
-->
