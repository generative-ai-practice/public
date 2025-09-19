# 翻訳ワークフロー概要

このドキュメントは、`scripts/translate-docs.ts` を中心としたドキュメント翻訳パイプラインの挙動をまとめたものです。

## 入力定義

- `translations/targets.csv`
  - `relative_path`: 原文ファイル（例: `README_original.md`）
  - `src_lang`: 原文の言語コード
  - `target_langs`: 翻訳先言語（複数の場合はカンマ区切り）
- `.translations.json`
  - 過去翻訳のメタデータを保持し、原文のハッシュやセグメントごとの訳文を記録します。
  - これをコミットしておくことで、差分翻訳が活用されます。

## 実行方法

- ローカル: `yarn translate` で本実行、`yarn translate:dry-run` で差分のみ確認
- CI: `.github/workflows/gemini-translation.yml` が `main` への push で自動実行し、翻訳結果を PR として提案します。
  - 自動生成される PR には既定で `skip-translation` ラベルが付与され、同ラベル付き PR が紐づくコミットであれば次回のワークフロー実行時に冒頭でスキップされます。ラベル名は `vars.GEMINI_TRANSLATION_SKIP_LABEL` で変更可能です。

## 処理の流れ

1. CSV を読み込み、対象ファイルと言語ペアを列挙
2. `.translations.json` を参照し、既訳の有無と原文ハッシュを比較
3. 翻訳対象を決定し、必要なセグメントだけ Gemini CLI に投げる
4. 生成した訳文を `_lang` サフィックスのファイルに出力し、メタデータを更新

## 初回と差分翻訳の扱い

- **初回翻訳**: `.translations.json` に該当キーが無い場合、ファイル全体を 1 回で翻訳します。
  - 全文翻訳後に原文と同じ段落構成へ分割し、次回以降利用するセグメント情報を保存します。
  - もし段落数が合わない場合は、自動的にセグメント単位の翻訳へフォールバックします。
- **差分翻訳**: 翻訳済みセグメントのハッシュが一致した場合は訳文を再利用し、変更がある段落のみ個別に再翻訳します。
  - 各セグメントを翻訳し終わるたびに進捗ログを出力します。

## ログ出力の例

```
[translate] Translated entire file README_original.md (ja→en).
[translate] Translated segment 3/44 for docs/github-workflows_original.md (ja→en).
```

## 注意点

- `.translations.json` を削除または該当キーだけ削ると初回翻訳モードになります。挙動を試したいときに便利です。
- `.translations.json` をコミットしないと、毎回全文翻訳になるため注意してください。
- Gemini CLI の一時ファイルパスは引用符で囲んでおり、空白や特殊文字が含まれても安全に動作します。
