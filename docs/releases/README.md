# Release Log System

このディレクトリには、リリースログ自動生成システムの設定とデータが含まれています。

## 概要

- **PRマージ時**: Gemini APIが自動的にリリースノートを生成し、`log.json` に追記
- **タグ作成時**: `log.json` から該当期間のエントリーを抽出し、Gemini APIで統合されたリリースノートを生成

## ファイル構成

- `log.json`: 全PRのリリースノート履歴（永続保存）
- `CHANGELOG.md`: 公開用リリースノート
- `INTERNAL_LOG.md`: 内部用技術ログ

## 使い方

### 自動生成（通常フロー）

1. PRをmainにマージ
   - GitHub Actionsが自動実行
   - Geminiがリリースノートを生成
   - `log.json` に自動追記

2. タグを作成（例: `v1.0.0`）
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

   - GitHub Actionsが自動実行
   - 前回タグからの全PRをGeminiが統合分析
   - `CHANGELOG.md` / `INTERNAL_LOG.md` を更新

### 手動でエントリーを追加する場合

```bash
yarn tsx scripts/add-pr-to-log.ts \
  123 \
  "2025-01-20T10:30:00Z" \
  "Add user authentication feature" \
  "username" \
  "feature,auth" \
  "ユーザー認証機能を追加しました" \
  "Passport.jsを使用したOAuth 2.0認証を実装"
```

## log.json スキーマ

```json
{
  "version": "1.0",
  "entries": [
    {
      "pr_number": 123,
      "merged_at": "2025-01-20T10:30:00Z",
      "title": "Add user authentication feature",
      "author": "username",
      "labels": ["feature", "auth"],
      "release_note": "ユーザー認証機能を追加しました",
      "internal_log": "実装詳細: Passport.js を使用した OAuth 2.0 認証"
    }
  ]
}
```

## トラブルシューティング

### Gemini APIエラー

- `secrets.GEMINI_API_KEY` が設定されているか確認
- API quotaを確認

### ワークフローが実行されない

- PRがmainブランチにマージされたか確認
- タグが正しいフォーマット（`v*`）か確認

## 詳細設計

詳細な設計方針は [../ai-instructions/release-log.md](../ai-instructions/release-log.md) を参照してください。
