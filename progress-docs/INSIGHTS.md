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

### [2026-04-29] 仕様と実装が乖離していても git log で確証できれば「史料保持 + v2 新設」で対応できる
- **内容**: `指示書.md`（Streamlit 想定）と実装（Next.js）の乖離が発見されたが、git log に `8cabfd9 migrate from Streamlit to Next.js with Vercel AI SDK` の明示的な移行コミットがあり、「実装が真」と確証できた。指示書を書き換えるのではなく、v1 を史料として保持しつつ `指示書-v2.md` を新設するアプローチで対応。情報捨象禁止原則に基づく
- **原文脈**: 2026-04-29 claude-project-base ハーネスからの管理基盤後付けセッション（PR #1）
- **関連**: PR #1, `指示書-v2.md` 末尾「v1 からの主な変更点」表
