# character-bot-demo — 開発ルール

## 役割分担

| 役割 | 担当 |
|------|------|
| 開発・実装 | dechi99991 |
| PM・要件定義・クライアント窓口 | 長瀬 |

---

## 開発フロー

### ブランチ運用

- **mainブランチに直接pushしない**
- 作業は必ずブランチを切って行う
  - 例: `feature/新機能名`, `fix/バグ内容`
- 変更はPull Request (PR) を作成してマージする

### 作業手順

1. `git checkout main && git pull` で最新を取得
2. `git checkout -b feature/○○` でブランチ作成
3. 作業・コミット
4. `git push -u origin feature/○○` でpush
5. GitHubでPull Requestを作成
6. レビュー後にマージ

### コミットメッセージ

- `feat:` 新機能
- `fix:` バグ修正
- `refactor:` リファクタリング
- `docs:` ドキュメント変更
- 例: `feat: ○○機能を実装`

### 注意事項

- 同じファイルの同時編集を避けるため、作業前に担当箇所を共有する
- `git push --force` は禁止

---

## PM側管理ツール

長瀬はClaude Code（AIコーディングツール）を使ってこのPJを管理しています。
以下のファイルがその管理用ファイルです（開発フローへの影響はありません）。

| ファイル | 用途 |
|---------|------|
| `progress-docs/PROGRESS.md` | タスク・進捗管理。TODO・対応待ち・保留を整理 |
| `progress-docs/SESSION-LOG.md` | 作業記録。セッションをまたいでも文脈を維持するため |
| `progress-docs/INSIGHTS.md` | PJを通じた気づき・学びの記録 |
| `.claude/` | Claude Codeのローカル設定（gitignore対象。各自の環境には影響しない） |

---

## PM側状況確認プロトコル（長瀬）

### セッション再開時の手順

1. `progress-docs/PROGRESS.md` を読む（現在地・ブロック・TODO 確認）
2. 追加の経緯が必要なら `CONTEXT.md` で補完
3. 外部待ちが解除されていたら PROGRESS.md を更新してからdechi99991へ連絡

### dechi99991への依頼前チェック

- PROGRESS.md の TODO / 外部待ちが最新か確認する
- 依頼内容に「なぜ今か」の背景を1行添える
