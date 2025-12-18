# リリースログ自動生成システム

## 目的

PRマージ時に自動的にリリースノートと内部ログを生成し、タグ作成時に集計して `CHANGELOG.md` と `INTERNAL_LOG.md` を出力するシステムを構築する。

## 背景・要件

- **手動作成の負担を削減**: PR作成者が手動でリリースノートを書く必要をなくす
- **一貫性のある品質**: Gemini AIによる自動生成で文章の品質を均一化
- **ファイル数の抑制**: 単一JSONファイルで全履歴を管理し、ファイル数の増加を防ぐ
- **公開用と内部用の分離**:
  - 公開用: ユーザー向けの分かりやすい説明
  - 内部用: 技術的な詳細、実装メモ

## アーキテクチャ概要

### ディレクトリ構造

```
docs/
  ai-instructions/
    release-log.md          # このドキュメント
  releases/
    log.json                # 全PRの履歴（単一ファイル）
    CHANGELOG.md            # 公開用リリースノート
    INTERNAL_LOG.md         # 内部用ログ
```

### データフロー

```
PR Merge (main)
  ↓
GitHub Actions トリガー
  ↓
PR情報取得（タイトル、本文、diff、ラベル）
  ↓
Gemini API で生成
  - 公開用リリースノート
  - 内部用技術ログ
  ↓
docs/releases/log.json に追記
  ↓
git commit & push
```

```
Tag作成時
  ↓
GitHub Actions トリガー
  ↓
log.json から該当期間のエントリーを抽出
  ↓
全エントリーを Gemini API に渡す
  - 関連するPRをグルーピング
  - 重複を排除
  - ユーザー目線で再構成
  ↓
CHANGELOG.md / INTERNAL_LOG.md 生成
  ↓
git commit & push
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
      "release_note": "ユーザー認証機能を追加しました。Google/GitHub アカウントでログイン可能になります。",
      "internal_log": "実装詳細: Passport.js を使用した OAuth 2.0 認証。セッション管理は express-session + Redis で実装。"
    }
  ]
}
```

## ワークフロー設計

### 1. PRマージ時の自動生成（`.github/workflows/release-log-on-merge.yml`）

**トリガー**: `pull_request` の `closed` イベント（`merged == true`）

**ステップ**:

1. PRメタデータ取得（番号、タイトル、本文、マージ日時、作成者、ラベル）
2. PR差分取得（`gh pr diff`）
3. Gemini API呼び出し
   - 入力: PRタイトル、本文、差分、ラベル
   - 出力: `release_note`, `internal_log`
4. `docs/releases/log.json` に新エントリーを追記
5. git commit & push

### 2. タグ作成時の集計（`.github/workflows/release-log-on-tag.yml`）

**トリガー**: `push` with `tags` パターン

**ステップ**:

1. 前回のタグとの差分期間を計算
2. `log.json` から該当期間のエントリーを抽出
3. Gemini API 呼び出し
   - 入力: 該当期間の全PRエントリー（リスト）
   - 処理: 関連PRのグルーピング、重複排除、優先度順の並び替え
   - 出力: `CHANGELOG.md` と `INTERNAL_LOG.md` の内容
4. 生成された内容でファイルを更新
5. git commit & push

## Gemini プロンプト設計

### 1. PRマージ時のプロンプト（個別PR分析）

**システムプロンプト:**

```
あなたはソフトウェア開発チームのリリースノート作成アシスタントです。
PRの内容を分析し、以下の2種類の文章を生成してください:

1. **公開用リリースノート (release_note)**:
   - エンドユーザー向けに分かりやすく
   - 技術用語を避け、利点を強調
   - 1-2文で簡潔に

2. **内部用技術ログ (internal_log)**:
   - 開発者向けの詳細情報
   - 実装方法、使用ライブラリ、技術的な判断理由
   - 将来のメンテナンスに役立つ情報

出力はJSON形式で返してください:
{
  "release_note": "...",
  "internal_log": "..."
}
```

**ユーザープロンプト:**

```
以下のPRを分析してください:

**タイトル**: ${PR_TITLE}
**本文**: ${PR_BODY}
**ラベル**: ${PR_LABELS}

**差分**:
${PR_DIFF}

上記の情報から、release_note と internal_log を生成してください。
```

### 2. タグ作成時のプロンプト（リリース全体の統合）

**システムプロンプト:**

```
あなたはソフトウェアのリリースノートを作成する専門家です。
複数のPRをまとめて、分かりやすいリリースノートを作成してください。

重要な点:
- 関連する複数のPRは1つの機能としてまとめる
- 重複する内容は排除する
- ユーザーにとって重要な順に並べる
- 公開用と内部用で適切に情報を分離する

出力形式:
{
  "changelog": "CHANGELOG.md の内容（Markdown形式）",
  "internal_log": "INTERNAL_LOG.md の内容（Markdown形式）"
}
```

**ユーザープロンプト:**

```
以下は今回のリリースに含まれる全てのPRです。
これらを分析し、統合されたリリースノートを生成してください。

【対象期間】
タグ: ${TAG_NAME}
前回タグ: ${PREVIOUS_TAG}
期間: ${START_DATE} 〜 ${END_DATE}

【PRリスト】
${JSON.stringify(entries, null, 2)}

上記から、以下を生成してください:
1. CHANGELOG.md: ユーザー向けの分かりやすいリリースノート
2. INTERNAL_LOG.md: 開発者向けの技術的な詳細

関連するPRはグルーピングし、重複は排除してください。
```

## 実装ステップ

### Phase 1: 基本構造の構築

- [ ] `docs/releases/` ディレクトリ作成
- [ ] `log.json` の初期ファイル作成
- [ ] 既存の `.changes/` 関連ファイルを削除

### Phase 2: PRマージ時の自動生成

- [ ] `.github/workflows/release-log-on-merge.yml` 作成
- [ ] Gemini API 統合（`google-github-actions/run-gemini-cli@v0` 使用）
- [ ] `log.json` への追記ロジック実装（TypeScript スクリプト）

### Phase 3: タグ作成時の集計

- [ ] `.github/workflows/release-log-on-tag.yml` 作成
- [ ] Gemini API統合（タグ作成時）
- [ ] `scripts/generate-changelog-from-log.ts` 実装
  - `log.json` から期間フィルタリング
  - Gemini API呼び出し
  - CHANGELOG.md / INTERNAL_LOG.md 生成

### Phase 4: テスト・ドキュメント

- [ ] テストPRでの動作確認
- [ ] README.md に使い方を追記
- [ ] 既存の `CHANGELOG.md` / `INTERNAL_LOG.md` をバックアップ

## 技術スタック

- **GitHub Actions**: ワークフロー実行
- **Gemini API**: リリースノート生成（`google-github-actions/run-gemini-cli@v0`）
- **TypeScript**: スクリプト実装（`tsx` で実行）
- **GitHub CLI (`gh`)**: PR情報取得

## 注意事項

- `log.json` は削除せず、永続的に履歴を保持
- Gemini API キーは `secrets.GEMINI_API_KEY` に設定
- `[skip ci]` を commit メッセージに含めて無限ループを防ぐ
- `log.json` へのコミットは競合を避けるため、マージコミット後に実行
