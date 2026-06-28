# character-bot-demo - セッションログ

<!-- セッションごとに「何を・なぜ・どう考えたか」を追記する -->
<!-- /session-end 実行時に最上部へ新エントリを追記 -->

## 2026-06-28 セッション② — recommend.ts 全体修正（藤井さん設計書§5準拠）

### 目的
- 藤井さんの設計書（`docs/ai-chatbot-tea-recommendation-control.md`）と既存実装の乖離を全体修正
- P0安全バグ（カフェインゼロ要求時に全商品フォールバック）修正
- §5-D 明示属性指定（産地・品種・製法の名指し）の実装
- safetyText によるマルチターン安全検出の実装

### 実施内容
1. **フローチャート更新** (`docs/flowchart-*.html`): recommend.ts の実装版に合わせた決定的レコメンダフローを可視化。4象限（モックロジック×実データ）の設計分析も実施
2. **藤井さん申し送り第2版** (`docs/handoff-to-fujii-2.md`): 4象限設計説明・P0バグ・旧商品名問題・実商品データ要請を170行で整理。「仮データ」誤表現も修正（商品属性は実データ反映済み・残件はShopifyURLのみ）
3. **旧商品名削除** (`lib/character.ts`, `lib/db/index.ts`): "Midnight Roaster"/"Silent Awakening" の参照を除去し動的カタログ参照に差し替え（長瀬さん承認のもと「変更禁止」ブロックを修正）
4. **recommend.ts 全体刷新**: P0修正・`applyAttributeFilter()`（§5-D）・`safetyText`引数・`no-candidate`/`attribute`ソース・キャンペーンをガードレール後に移動・好み+3/シーン気分+2
5. **chat-handler.ts**: `extractRecentUserText()`・`buildNoCandidateDirective()`追加。no-candidate/null product の2分岐対応
6. **mock-chat-handler.ts**: no-candidate 経路で正直メッセージを返す
7. **テスト拡充**: 12→33件（+21件）。no-candidate/§5-D属性指定/safetyTextマルチターン全カバー

### 設計変遷
- **「仮データ」認識の訂正**: 藤井さんからのデータは「仮ではなく本物（CSVフォーマットがモック形式なだけで属性値は実商品のもの）」と判明。4象限の「B: 実データ×Gemini本番」に正しく更新。次にやることは商品属性の追加修正ではなく ShopifyURL の差し替えのみ
- **applyAttributeFilterのトークン分離**: 産地は都道府県プレフィックスのみ（「鹿児島県南九州市頴娃」→「鹿児島」）。BLOCKLIST（"合組"・"全国各地"等）で汎用語の誤マッチを防止。2文字未満も除外
- **テストで製法マッチの誤判定を発見**: "被せ"製法がとこのは（"被せ・深蒸し"）だけでなくあまもあ（"被せ・浅蒸し"）にも存在しており、テスト期待値が誤りだった。"深蒸し"（とこのは固有）に修正

### 学び
- **属性フィルタのテストは先にDBデータを実確認する**: `grep`等でDBの実データを確認してからテスト期待値を書く。製品属性の重複を見落とすリスクを防ぐ
- **no-candidate は第3の独立した状態**: `null`（雑談）と混在させると安全バグと不誠実なUXを招く。LLMへの別指示が必要なため source として明示的に分離する

### 結論・次ステップ
- 動画録画 + 全シナリオテスト → PR作成 → mainマージ（次回セッション）
- 正式ShopifyURLを藤井さんから受領 → `db/index.ts` URL差し替え → 再テスト → マージ

### ブランチ
- `feature/real-product-data` — 4コミット追加（e760b9e / 39d93cd / 04d246e / a2c6bf2）

---

## 2026-06-28 セッション — 実商品データ投入 + 属性ベースレコメンド実装

### 目的
- 藤井さんから受領した実商品ナレッジカード（5商品）をDBに投入
- MOCK_CHATモードで属性ベース（カフェイン/シーン/気分/初心者）のレコメンドロジックを実装
- 次回テスト・動画録画に備えてブランチをpush

### 実施内容
1. **feature/real-product-data ブランチ作成**
2. **`lib/db/index.ts` 実データ投入**: SEED_PRODUCTS を5商品に置き換え（茶のことはじめ/こがれ/ながとき/あまもあ/とこのは）。SEED_SALES_RULES を実商品名対応の3ルールに更新。`tasteProfile` をオプショナル化（セット商品は値なし）
3. **`lib/context-builder.ts`**: `tasteProfile` が undefined のとき味プロファイル行をスキップ
4. **`lib/mock-chat-handler.ts`**: SalesRuleキーワードマッチに加え、属性ベースレコメンド関数 `pickProductByAttributes` を追加（カフェイン→初心者/セット→シーン/気分スコアリングの順で評価）
5. **動作確認**: T-01（夜/カフェイン控えたい → こがれ）を確認済み。残シナリオは次回テスト

### 設計変遷
- **SalesRuleの役割**: 旧ダミー商品（Midnight Roaster/Silent Awakening）を参照していたルールを、実商品名（こがれ/とこのは/茶のことはじめ）に更新。ルール3（初心者/ギフト → 茶のことはじめ）を新規追加
- **属性ベースレコメンド**: MOCK_CHATモードでもシーン・気分マッチが機能するよう、SalesRuleの後段に `pickProductByAttributes` を追加。Geminiモードではプロンプト経由で同等の判断をLLMが行う

### 結論・次ステップ
- 全シナリオテスト + 動画録画 → PR → mainマージ（次回セッション）
- 正式ShopifyURLは藤井さんから入手後に差し替え

### ブランチ
- `feature/real-product-data` — push済み（1コミット）

---

## 2026-06-25 セッション — 藤井さんレコメンド設計実装 + テスト記録

### 目的
- 藤井さんの「AIチャットボット お茶レコメンド制御設計」文書をコードに反映
- PM（長瀬）回答分（Q2/Q4/Q5/Q6/Q8/Q10/Q11/Q12/Q14/Q15/Q18/Q19/Q20/Q21/Q22/Q24/Q25）を要件ドキュメントに記録
- 藤井さんへの申し送り文書（handoff-to-fujii.md）作成
- デモ動作確認 + テストシナリオ記録

### 実施内容
1. **ヒヤリング回答反映** (`docs/requirements-hearing.md`): PM確認分17問に回答・設計決定を記録。キャラ名「チャ・レノン」不採用確定、会話ログ取得・Shopify連携が明示要件化
2. **要件復元書タグ更新** (`docs/requirements-recovery.md`): 明示指示15件・AI暗黙17件・要確認8件に整理。REQ-108/301/303/404/405/503/602 を更新
3. **商品ナレッジモデル拡張** (`lib/db/index.ts`): TasteProfile（5要素）/ CaffeineLevel / BrewingDifficulty 型追加。ShopifyProduct に category / origin / tasteProfile / scenes / moods / brewingMethods / purposes / isSet を追加。SEED_PRODUCTS 4件にダミー値を設定
4. **コンテキストビルダー改修** (`lib/context-builder.ts`): 商品カードを「カフェイン・味プロファイル・シーン・気分・用途」含むリッチ形式に変換。ハードガードレール通過後の選択指示文に変更
5. **キャラクター設定強化** (`lib/character.ts`): 「役割と時間で語る」トーン・マルチカルチャー属性・ハードガードレール①〜④+ソフト推薦原則を追加。S1〜S4は変更なし
6. **藤井さん申し送り作成** (`docs/handoff-to-fujii.md`): 実装概要・未確認事項・AI仮定・ドキュメントギャップを166行で整理
7. **デモ + テスト記録** (`docs/test-scenarios.md`): T-01〜T-06 を実行・記録。未テスト項目と藤井さんデータ受領後のテスト計画を文書化

### 設計変遷
- **ハードガードレール vs ソフト推薦の分離**: 藤井さん文書に「カフェインは機械的に除外してほしい」という明示あり → ハードガードレール①を「カフェイン」として最優先に位置付け。ソフト原則（シーン・気分）は Gemini の判断に委ねる分業設計に落ち着いた
- **tags フィールドの廃止**: ShopifyProduct に category/scenes/moods 等を追加した際、冗長な `tags: string[]` を削除。mock-chat-handler.ts が tags を未参照であることを grep で事前確認してから削除（安全確認→変更の手順を踏んだ）
- **SalesRule の役割縮小**: 藤井さん設計では「商品カタログが主、SalesRule（キャンペーン等）が従」という構造。section タイトルも「特別・キャンペーン用レコメンド指針（補助）」に変更した
- **MOCK_CHAT の限界の明文化**: シーン・気分・isSet 等の属性は LLM（Gemini）が使うもので MOCK_CHAT では機能しないことをテストで確認。test-scenarios.md §2 に文書化

### 学び
- **商品属性の型設計**: シーン・気分・淹れ方を `string[]` にすることで、Gemini へのプロンプト注入とコード側フィルタの両方に使い回せる。型と DB スキーマを一致させておくと D1 移行時の変換コストが下がる
- **MOCK_CHAT は「キーワードルール」の動作テスト専用**: LLM 推論を要するシナリオ（scenes/moods マッチ・初心者判定・トーン制御）は MOCK=false の統合テストが必要。テスト計画に明示しておくべき
- **ガードレール設計の二重性**: プロンプト制御（ソフト）だけでは「モデルが従わない」リスクがある。コード側フィルタ（ハード）を Phase 2 で追加することで二重防御になる。この判断は handoff Q1 として藤井さんに共有済み

### 結論・次ステップ
- `gh auth refresh -s workflow` → `git push` → PR 作成 → main マージ（push ブロック中）
- 藤井さんへ `docs/handoff-to-fujii.md` を送付して実商品データを入手
- Phase 2: 実データで SEED 上書き → Gemini モード統合テスト（test-scenarios.md §3 参照）

### ブランチ
- `feature/tea-room-ui` — 9コミット積み上げ（push 待ち）。最新: e496ea4

---

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
