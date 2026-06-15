# character-bot-demo - セッションログ

<!-- セッションごとに「何を・なぜ・どう考えたか」を追記する -->
<!-- /session-end 実行時に最上部へ新エントリを追記 -->

## 2026-06-15 セッション — Cloudflare Workers 移行設計 + 管理画面プロトタイプ実装

### 目的
- プロジェクト全体像の把握とヒヤリング
- 寺園さんへの委託に向けた要件定義書の整備
- 現行ロジックの疎結合リファクタリング
- DB・CRUD API・管理画面のプロトタイプ実装

### 実施内容
1. **ヒヤリング（全体像確定）**: Cloudflare Workers 全面移行・DB 3種（話題/営業ルール/ログ）・管理画面・フロントは現行デモ踏襲を確定
2. **要件定義書作成** (`docs/requirements-for-terazono.md`): 全13章。アーキテクチャ図・API 型定義・D1 DDL・フェーズ計画・未決事項10件を含む
3. **疎結合リファクタリング**: `lib/db/index.ts`（DB抽象 IF）/ `lib/context-builder.ts`（プロンプト注入ビルダー）/ `lib/chat-handler.ts`（フレームワーク非依存コア）/ `app/api/chat/route.ts`（薄いアダプター化）
4. **A/B/C 実装**: InMemoryDataStore（Seed データあり）+ CRUD API（topics/sales-rules）+ `/api/log`
5. **管理画面プロトタイプ** (`app/admin/page.tsx`): 話題・営業ルールの追加/有効無効/削除。認証なし（Phase 3 で Cloudflare Access 追加予定）
6. **PR #3 作成・マージ・ブランチ後処理**: `feature/cloudflare-migration-prep` → main
7. **INSIGHTS.md 復元**: opus-thinker が過去エントリを誤削除 → 手動修正

### 設計変遷
- **DB選択**: Vercel Postgres / Turso / In-Memory の3案を検討。「追加パッケージゼロ・即デプロイ可・D1 実装の差し替えで移行完了」という基準で In-Memory を採用。プロトタイプとして割り切る判断
- **管理画面 UI**: Google フォーム案を検討したが「閲覧できない・編集削除不可・拡張困難」の3点で不採用。自前シンプルフォームへ
- **指示書-v2.md の確認依頼**: 前セッションから dechi さん待ちだったが、プロジェクト方向（Cloudflare Workers 移行）が変わったことでもはや陳腐化。PR #2 クローズ・PR #3 で新申し送りに切り替え

### 学び
- フロントエンドのデザインが届いていなくても、API/DB/管理画面の提供物が決まっていれば要件定義書と実装サンプルを先行整備できる
- サブエージェント（opus-thinker）は `progress-docs/` 等の管理ファイルを意図せず変更することがある。プロンプトで「変更禁止ファイル」を明示するか、事後検証を行う
- In-Memory Singleton は Vercel サーバーレスの warm インスタンス内で生きる。パッケージ不要のプロトタイプとして有効

### 結論・次ステップ
- 要件定義書を寺園さんと共有し §13 未決事項（認証・CORS・D1）を詰める
- 指示書-v2.md を Cloudflare Workers 移行方針に更新
- operation-guide.md / client-qa-*.md の Streamlit 記述を更新

### ブランチ
- `feature/cloudflare-migration-prep` → main へ PR #3 でマージ済み（4コミット）

---

## 2026-04-30 セッション — PR #1 マージ + 後片付け

### 目的
- PR #1（Claude Code 管理基盤 + 指示書 v2）の状態確認・処理
- ローカル/リモート状態の最新化と申し送り整備

### 実施内容
1. **PR #1 マージ**: dechi さん（オーナー）レビュー待ちだったが、CI green（Vercel SUCCESS）+ WRITE 権限保有を確認のうえ長瀬側で squash merge（→ `f013271`）
2. **リモート feature ブランチ削除確認**: GitHub 側は削除済み、ローカルの stale ref を `git fetch --prune` で解消
3. **PROGRESS.md 更新**: 「進行中」「〇〇待ち」から PR #1 関連を除去、dechi さん向け申し送りセクションを追加
4. **SESSION-LOG.md 更新**: 本エントリ追加
5. **新ブランチ `feature/post-merge-handoff` で進捗整理コミット**（→ `560d927`）+ push
6. **PR #2 作成**: 進捗整理 + dechi さんへの申し送り（https://github.com/dechi99991/character-bot-demo/pull/2）
7. **PR #1 へ事後通知コメント**: マージ報告 + 確認依頼 + PR #2 への導線

### 設計変遷
- **当初想定**: dechi さんレビュー・マージ待ち
- **転換契機**: PM（長瀬）から「勝手にマージできないか、そのまま進めたい」との判断
- **採用方針**: WRITE 権限を活かして長瀬側 merge → 事後通知（PR コメント + progress-docs）

### 学び
- **WRITE 権限保有時の判断**: コードオーナーのレビューが手薄な場合、WRITE 権限保有者は CI green + 軽微変更を条件に事後通知前提で先行マージできる。スピード重視の運用パターン
- **事後通知の3重化**: 1回限りの通知（Slack 等）よりも (a) PR コメント / (b) 後続 PR / (c) progress-docs/ の永続ドキュメント の3経路を併用すると、相手の作業タイミングに依存せず確実に到達する。pull 時に自動で目に入る progress-docs/ が「読まれない通知」リスクを下げる

### 結論・次ステップ
- PR #1 マージ済み・リモートブランチ削除済み
- PR #2 作成済み（dechi さん確認待ち、〇〇待ちに登録）
- 残 TODO 4件は PROGRESS.md に保持（dechi さん事実確認 / operation-guide.md 更新 / client-qa.md 確認 / 指示書.md 保持）
- TODO 着手は次セッション以降（ユーザー判断で後回し）

### ブランチ
- `feature/post-merge-handoff` — PROGRESS.md / SESSION-LOG.md 更新（PR #1 マージ後の片付け）

---

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
