# INSIGHTS — character-bot-demo の学び

このPJで生まれた学び・気づき・アイデアを記録する。
`/harness-insights`（collect フェーズ）実行時にハーネスに吸い上げられ、必要に応じてフィロソフィー層に昇格する。

## エントリフォーマット

```markdown
### [YYYY-MM-DD] <タイトル>
- **内容**: <学び・気づき・アイデアの要約>
- **原文脈**: <作業との関連・発生場面>
- **関連**: <関連する git commit、SESSION-LOG 該当箇所 等>（任意）
```

各PJの INSIGHTS.md は L 層分類せずフラットに学びを並べる。
L 層判定は `/harness-insights` 実行時にハーネス側で行う。

## ステータス体系（参考）

ハーネス INSIGHTS で使われるステータス:
- `📥 incoming` — 未処理
- `✅ applied` — 承認 + TODO化 / フィロソフィー反映済み
- `❌ rejected` — 不採用

---

## 学びログ

（エントリはここに時系列で追加される。新しいものを上に）

### [2026-06-15] フロントレス要件定義はデザイン待ちと切り離せる
- **内容**: 我々の提供物が「API・DB・管理画面」だけの場合、フロントエンドのデザインが届いていなくても要件定義書と実装サンプルを先行して整備できる。ヒヤリング→疎結合設計→サンプル実装の流れで、受託先（寺園さん）への技術的な申し送りを早期に完成させられた
- **原文脈**: 2026-06-15 セッション。DLS（先方）のデザイン前に寺園さん向け要件定義書＋管理画面プロトタイプを完成させた
- **関連**: `docs/requirements-for-terazono.md`, PR #3

### [2026-06-15] In-Memory Singleton は Vercel サーバーレスでの CRUD プロトタイプに使える
- **内容**: Vercel サーバーレス環境でも module-level singleton は warm インスタンス内で生きる。Cloudflare D1 実装前のプロトタイプとして「データが消えることを明示した上での InMemory CRUD」は動作確認に十分機能する。追加パッケージゼロで即デプロイできる利点が大きい
- **原文脈**: 2026-06-15 セッション。A/B/C 実装で DB パッケージを入れずに CRUD API を動かす方針を選択
- **関連**: `lib/db/index.ts`（InMemoryDataStore）, commit `1d38b5d`

### [2026-04-30] レビュー前マージ時の事後通知は3経路の冗長化が信頼性を上げる
- **内容**: コードオーナー不在で WRITE 権限保有者がレビュー前マージした際、事後通知は (a) 既存 PR へのコメント / (b) 後続 PR の作成 / (c) リポジトリ内の永続ドキュメント（progress-docs/PROGRESS.md 申し送りセクション）の3経路を併用すると、相手の作業タイミング・通知設定に依存せず確実に到達する。特に (c) は pull 時に自動で目に入るため「Slack 1回投稿で見落とし」を構造的に防ぐ
- **原文脈**: 2026-04-30 PR #1 マージ後セッション。WRITE 権限で先行マージしたあと dechi さんへの申し送り経路をどう設計するかを検討
- **関連**: PR #1 (#issuecomment-4349523026), PR #2

### [2026-04-30] GitHub の auto-delete-branch 設定後はローカル stale ref が残るので fetch --prune が必要
- **内容**: GitHub PR マージ時に branch auto-delete が動くと、ローカルの `git branch -a` には依然 `remotes/origin/feature/xxx` が表示される。`git push origin --delete` は「remote ref does not exist」エラーになる。`git fetch --prune` で stale ref を解消するのが正規ルート
- **原文脈**: 2026-04-30 PR #1 マージ後にリモートブランチ削除を試みた際に発生
- **関連**: なし

### [2026-04-29] 仕様と実装が乖離していても git log で確証できれば「史料保持 + v2 新設」で対応できる
- **内容**: `指示書.md`（Streamlit 想定）と実装（Next.js）の乖離が発見されたが、git log に `8cabfd9 migrate from Streamlit to Next.js with Vercel AI SDK` の明示的な移行コミットがあり、「実装が真」と確証できた。指示書を書き換えるのではなく、v1 を史料として保持しつつ `指示書-v2.md` を新設するアプローチで対応。情報捨象禁止原則に基づく
- **原文脈**: 2026-04-29 claude-project-base ハーネスからの管理基盤後付けセッション（PR #1）
- **関連**: PR #1, `指示書-v2.md` 末尾「v1 からの主な変更点」表
