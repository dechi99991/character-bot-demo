# character-bot-demo — プロジェクト指針

## プロジェクト概要

tayumano（お茶ブランド）向けキャラクターBot。原作テキストをベースに、キャラクター「チャ・レノン（お茶好きの兄ちゃん）」が回答する Web チャットボット。

- 関係者: PM=長瀬、開発=dechi99991
- ホスティング: Vercel（移行後）
- LLM: Google Gemini 2.5 Pro（@ai-sdk/google）

## ⚠️ 要確認事項: ドキュメントと実装の不整合

**`指示書.md` は initial spec（フェーズ1: Streamlit + Python）の史料。実装は明示的に Next.js + Vercel AI SDK へ移行済み**（`commit 8cabfd9 migrate from Streamlit to Next.js with Vercel AI SDK`）。

| 項目 | 指示書.md（v1 史料） | 実装（現状） |
|------|----------------------|-------------|
| 技術 | Streamlit + Python | Next.js 15 + TypeScript |
| LLM SDK | google-generativeai | @ai-sdk/google (Vercel AI SDK) |
| デプロイ | Streamlit Cloud | Vercel |

- **新規開発・運用は `指示書-v2.md` を参照すること**（Next.js 構成を反映）
- `指示書.md` は史料として保持（変更しない）
- `docs/operation-guide.md` も Streamlit 時代の記述あり → 後日更新が望ましい

## セットアップ

<!-- 管理PJ（コード無し）の場合: このセクションと「コードスタイル」を削除し、「責務・管理対象」「共有メモリ管理元ルール」セクションに置換 -->
<!-- 「run the tests」で初回から動くように、ビルド・テスト・起動手順を書く -->
<!-- マイグレーション途中のコードを放置しない（モデルが誤パターンを拾う） -->

## コードスタイル

- linterで強制できるルールはここに書かない（.claude/settings.jsonやHookで対応）
- 既存コードのスタイルに合わせる

## プロジェクト固有のルール

## 品質管理ルール

- 編集前にコードベースを調査せよ。読んでいないコードは変更するな
- 推測で埋めるな。わからないなら聞け
- サブエージェントの成果物は必ず自分で検証してから報告すること
- 成果物はファイルに書き出す（チャットに流さない）

## 自動化されている仕組み

| 仕組み | タイミング | 説明 |
|--------|-----------|------|
| 安全チェック | コマンド実行前 | 危険コマンド・外部通信・~/.claude/ 書き込みをブロック |
| 自動コミット | 応答完了時（条件付き） | staged あり AND 直近5分明示commitなしの場合、ファイル名入り動的メッセージで auto commit |
| 状態保存 | コンテキスト圧縮前 | PROGRESS.md に進行状態を書き出し |
| セッション終了処理 | `/session-end` 実行時（手動） | やらかし記録・progress-docs更新・commit & push |

## effortLevel 使い分け

デフォルト: `medium`（settings.json）。`/session-start` トリアージ後に GUI で調整する。GUI変更は `settings.local.json` に保存されコミット対象外。

| レベル | 用途 |
|--------|------|
| `low` | typo修正、1行変更、単純な質問 |
| `medium` | 通常の開発作業（デフォルト） |
| `high` | 複数ファイルにまたがる実装・設計 |
| `max` | 大規模設計、複雑なデバッグ（Opus 4.6のみ） |

セッション中は `/fast` トグルで出力速度を優先できる。

## 制約の設計方針

| 制約レベル | 実装場所 | 強制力 | 例 |
|-----------|---------|--------|-----|
| ハード制約 | .claude/settings.json / Hook | 例外なく毎回 | 危険コマンドブロック、自動コミット |
| ソフト制約 | CLAUDE.md / .claude/rules/ | ほぼ毎回 | コードスタイル、品質管理ルール |
| 都度指示 | プロンプト | その場限り | 「今回はテストスキップして」等 |

## 境界ルール

- **`~/.claude/` を変更しない** — `/harness-insights` を通じて行う（settings.jsonのdenyでも強制）
- **他プロジェクトのファイルを変更しない** — 知見は `progress-docs/` に記録

## 共有メモリ（複数PJで共通情報を参照する場合）

<!-- 複数PJで同一情報（ブランド情報・チーム構成等）を参照する場合のみ記載。単独PJなら削除してよい -->

- 参照先: `~/.claude/shared/<group>/memory/`
- セッション開始時に `~/.claude/shared/<group>/memory/MEMORY.md` を読む
- 更新時は関連PJへの影響を確認する
- 詳細パターンは claude-project-base の `ENVIRONMENT-GUIDE.md`「共有メモリパターン」参照

## コンテキスト管理

| コマンド | いつ使う | 効果 |
|---------|---------|------|
| `/compact` | コンテキスト使用率50%前後 | 会話を要約して圧縮。指示付きで実行するのが望ましい |
| `/clear` | タスク切り替え時 / 同じ問題で2回失敗した時 | 会話をリセット。progress-docs に状態が保存されているので安全 |
| `/rewind`（Esc Esc） | 脱線した時 | 直前の操作を取り消して戻る |

- `/compact` は **50%到達前に手動実行** が推奨。自動圧縮を待つと情報が欠落しやすい
- 調査タスクはサブエージェントに委譲してメインコンテキストを温存する
- PreCompact Hook が圧縮前に PROGRESS.md へ状態を自動保存する

## やらかしログ

`.claude/rules/mistakes.md` にPJ固有のやらかしを蓄積。
セッション開始時に自動読み込み。`/session-end` 実行時にヒアリング経由で追記。手動追記もOK。

## 進捗管理（progress-docs）

`/session-end` 実行時に更新。PreCompact Hook がコンテキスト圧縮前に自動保存。手動での確認・修正もOK。

## フィードバックループ

1. **誤りを検知** → 2. **原因を判断** → 3. **制約を追加（CLAUDE.md or Hook）** → 4. **検証**
