# tayumano AIチャットBot — クライアントQ&A #01

作成日: 2026-03-13

---

## Q1. Streamlit Community Cloud の有料枠はいくら？

**現時点（2026年3月）では有料プランは存在しません。**

過去にTeams/Enterpriseプランの表示がありましたが、現在は廃止されており、Community Cloud（無料）のみです。

参考: https://streamlit.io/cloud

### 無料枠の制約

| 項目 | 制約 |
|---|---|
| パブリックアプリ数 | 無制限 |
| プライベートアプリ数 | 1つまで |
| リソース | 共有インフラ（CPU/メモリ上限あり） |
| コールドスタート | アクセスがないとスリープ → 復帰に数十秒 |
| SLA | なし（ダウンしても保証なし） |
| 独自ドメイン | 不可（xxx.streamlit.app 固定） |

有料でリソースを増やしたい場合は、Streamlit Cloud ではなく **自前ホスティング**（Cloudflare Workers、Cloud Run 等）に移行する形になります。

---

## Q2. このまま AI Studio + Streamlit Cloud で商用デプロイしてよいか？

### 結論: **Streamlit Cloud での商用利用は利用規約違反です。**

> "You may only use the Community Cloud for personal and non-commercial purposes"
> — [Streamlit Community Cloud Terms of Use](https://streamlit.io/deployment-terms-of-use)

クライアントのウェブサイトにiframeで埋め込む＝**商用利用**に該当するため、このままの構成では規約上NGです。

### Gemini API 側は条件付きでOK

| 利用形態 | 商用利用 | データの扱い |
|---|---|---|
| 無料枠（Billing未設定） | 可能 | Google がプロンプト・応答を学習に利用する可能性あり |
| 有料枠（Billing設定済み） | 可能 | Google はプロンプト・応答を学習に利用しない |

参考: https://ai.google.dev/gemini-api/terms

**推奨: Cloud Billing を有効化した「有料枠」での利用。** ユーザーの会話内容がGoogleの学習データに使われないことが保証されます。

---

## Q3. では、どうすればよいか？

### 推奨構成: Cloudflare Workers + Pages + 独自ドメイン

Streamlit Cloud から脱却し、商用利用可能なインフラに移行します。

```
[ユーザー]
    ↓ https://chat.tayumano.com（独自ドメイン）
[Cloudflare Pages] ← 静的フロントエンド（HTML/CSS/JS）
    ↓ API呼び出し
[Cloudflare Workers] ← バックエンド（Gemini API中継）
    ↓
[Google Gemini API] ← 有料枠（Billing有効化済み）
```

### なぜ Cloudflare か

| 比較項目 | Streamlit Cloud | Cloudflare Workers + Pages |
|---|---|---|
| 商用利用 | ❌ 規約違反 | ✅ OK |
| 独自ドメイン | ❌ 不可 | ✅ 無料で設定可 |
| コールドスタート | あり（数十秒） | なし（エッジ実行） |
| UI自由度 | 低い（Streamlit依存） | 完全自由（HTML/CSS/JS） |
| SLA | なし | 99.9%（有料プラン） |
| 月額固定費 | ¥0 | ¥0〜750（$0〜5） |

---

## Q4. 移行に必要な手順と開発工数

### 必要な作業

| # | 作業内容 | 説明 |
|---|---|---|
| 1 | フロントエンド作成 | チャットUI を HTML/CSS/JS で構築（現Streamlitアプリの見た目を再現） |
| 2 | バックエンド作成 | Cloudflare Worker で Gemini API を中継するエンドポイントを作成 |
| 3 | 独自ドメイン設定 | Cloudflare にドメインを追加し、Pages に紐づけ |
| 4 | APIキー管理 | Worker の環境変数に Gemini API キーを設定（ソースコードに含めない） |
| 5 | セキュリティ対応 | CORS設定、レート制限、プロンプトインジェクション対策の維持 |
| 6 | テスト・動作確認 | 埋め込み先サイトでの表示・動作確認 |

### 開発工数の見積もり

| シナリオ | 工数 | 内訳 |
|---|---|---|
| 楽観（シンプルなチャットUIで十分） | **3〜5日** | フロントエンド1〜2日 + バックエンド1日 + ドメイン設定0.5日 + テスト0.5〜1日 |
| 悲観（デザイン凝る＋細かい調整多い） | **7〜12日** | フロントエンド3〜5日 + バックエンド2〜3日 + ドメイン設定0.5日 + テスト1.5〜3日 |

---

## Q5. 移行後のランニングコスト

### 固定費

| 項目 | 月額 | 備考 |
|---|---|---|
| Cloudflare Workers + Pages（Free） | ¥0 | 10万リクエスト/日まで無料 |
| Cloudflare Workers + Pages（Paid） | ¥750（$5） | 1,000万リクエスト/月、本番推奨 |
| 独自ドメイン（.com） | 約¥1,500/年（≒¥125/月） | レジストラによる |
| **固定費合計** | **¥125〜875/月** | |

### 変動費（Gemini API — 現行と同じ）

| 規模感 | 月間会話数 | API月額 |
|---|---|---|
| 楽観（小規模） | 500会話 | 約 ¥1,000 |
| 標準 | 2,000会話 | 約 ¥5,000 |
| 悲観（バズった場合） | 10,000会話 | 約 ¥30,000 |

### トータル月額

| シナリオ | 月額合計 |
|---|---|
| 楽観（小規模 + Workers Free） | **約 ¥1,100/月** |
| 標準（Workers Paid） | **約 ¥5,900/月** |
| 悲観（大規模） | **約 ¥31,000/月** |

---

## まとめ: 次のアクション

| # | アクション | 優先度 |
|---|---|---|
| 1 | **Google AI Studio の Cloud Billing を有効化**し、有料枠に切り替える（ユーザーデータ保護のため） | 高 |
| 2 | **Google AI Studio で月額予算アラート（¥10,000）を設定** | 高 |
| 3 | **Cloudflare Workers + Pages への移行を決定**し、開発着手 | 中 |
| 4 | 独自ドメイン取得（chat.tayumano.com 等） | 中 |
| 5 | 移行完了後、Streamlit Cloud のアプリを削除 | 低 |
