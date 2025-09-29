# GitHub Workflows 説明

## 概要

このリポジトリには5つのGitHub Actions ワークフローがあり、Gemini AI を使った自動化処理を行います。併せて、ドキュメント翻訳パイプラインについては `docs/translation-workflow.md` に詳細な説明をまとめています。さらに、エージェント向けドキュメント（`CLAUDE.md` と `AGENTS.md`）の同期をCIで検証するステップも導入されています。

## ワークフロー構成

### 1. 🔀 Gemini Dispatch (`gemini-dispatch.yml`)

**メインの振り分けワークフロー**

#### トリガー条件

- Pull Request の作成・レビュー・コメント
- Issue の作成・再オープン・コメント

#### 動作分岐

- `@gemini-cli /review` → Review ワークフローを実行
- `@gemini-cli /triage` → Triage ワークフローを実行
- `@gemini-cli [その他]` → Invoke ワークフローを実行
- PR オープン時 → 自動的に Review を実行
- Issue オープン時 → 自動的に Triage を実行

#### 権限チェック

- フォークからのPRは無視
- コメント投稿者は OWNER/MEMBER/COLLABORATOR のみ受け付け

### 2. 🔎 Gemini Review (`gemini-review.yml`)

**プルリクエストの自動レビュー**

#### 使用する Gemini API

- `google-github-actions/run-gemini-cli@v0` アクションを使用
- Vertex AI または Gemini API Key で認証
- 設定: `vars.GOOGLE_GENAI_USE_VERTEXAI`, `secrets.GEMINI_API_KEY`

#### プロンプト内容

`prompt` セクション（104-272行目）に詳細なレビュー指示が記載：

- コード品質チェック（正確性、セキュリティ、効率性）
- 保守性、テスト、パフォーマンスの評価
- 重要度別コメント分類（🔴Critical〜🟢Low）
- GitHub PR に直接レビューコメントを投稿

#### MCP サーバー設定

GitHub MCP サーバーを使用してPR操作を実行：

- `get_pull_request_diff`, `create_pending_pull_request_review`
- `add_comment_to_pending_review`, `submit_pending_pull_request_review`

### 3. 🔀 Gemini Triage (`gemini-triage.yml`)

**Issue の自動トリアージ**

#### 機能

- リポジトリのラベル一覧を取得
- Issue の内容を分析してラベル付けを提案
- より簡潔なプロンプトでトリアージを実行

### 4. 🔀 Gemini Invoke (`gemini-invoke.yml`)

**汎用的なGemini呼び出し**

#### 用途

- ユーザーからの任意のリクエストに対応
- `@gemini-cli` に続く内容を追加コンテキストとして処理

### 5. 🔀 Gemini Scheduled Triage (`gemini-scheduled-triage.yml`)

**定期実行でのトリアージ**

#### スケジュール

- 設定された時間に自動実行
- 未対応の Issue を定期的にトリアージ

### 6. ✅ Agent Guide Sync Check（`ci.yml` 内ステップ）

**CLAUDE.md と AGENTS.md の同期検証**

#### 役割

- `yarn sync:agents` を実行してローカルでの同期漏れを検出
- `git diff --exit-code CLAUDE.md AGENTS.md` で両ファイルの差分を確認し、同期されていなければジョブを失敗させる
- 失敗時には「`yarn sync:agents` を実行して同期してほしい」という明示的なエラーメッセージを出力

#### 背景

- `CLAUDE.md` を正とし、ローカルで `yarn sync:agents` を実行することで `AGENTS.md` に内容をコピーする運用
- どちらか一方だけを編集したままコミット・PRすると、CI で差分が検出されるため早期に気付ける
- 開発者は `CLAUDE.md` を更新した後に `yarn sync:agents` を忘れず実行し、両ファイルを同一コミットで更新する

## 認証と設定

### 必要な環境変数/シークレット

- `vars.APP_ID`, `secrets.APP_PRIVATE_KEY` - GitHub App認証
- `secrets.GEMINI_API_KEY` または `secrets.GOOGLE_API_KEY` - Gemini API
- `vars.GCP_WIF_PROVIDER`, `vars.GOOGLE_CLOUD_PROJECT` - Vertex AI用
- `vars.SERVICE_ACCOUNT_EMAIL` - GCP サービスアカウント

### Gemini設定

- Vertex AI使用: `vars.GOOGLE_GENAI_USE_VERTEXAI`
- Code Assist使用: `vars.GOOGLE_GENAI_USE_GCA`
- デバッグモード: `vars.DEBUG`

## プロンプトの場所

各ワークフローファイルの `prompt` セクションに詳細な指示が記載：

- **Review**: 272行の詳細なコードレビュー指示
- **Triage**: Issue分類とラベル付けの指示
- **Invoke**: 汎用的な対話指示

## 実行フロー

1. **Dispatch** でリクエストを解析・振り分け
2. 該当する専用ワークフロー（Review/Triage/Invoke）を実行
3. Gemini AI が指示に従って処理を実行
4. 結果をGitHub（PR/Issue）に投稿
5. エラー時は `fallthrough` でエラーメッセージを投稿
