# Provider Information Collector System - Implementation Plan

**Created:** 2026-01-02
**Target:** MulmoChat provider2agent.ts 情報更新システム
**Phase 1:** Anthropic (Claude) プロバイダー対応
**Language:** TypeScript (.ts)

---

## 📋 概要

MulmoCastの[provider2agent.ts](https://github.com/receptron/mulmocast-cli/blob/main/src/utils/provider2agent.ts)定義を最新に保つため、各AIプロバイダーの情報を自動収集する仕組みを構築する。

**全ファイルTypeScriptで実装** - `.ts` 拡張子

### アプローチ

**ハイブリッド方式**: 構造化データ(API/RSS)優先 + Gemini SDK補完

- 構造化API (JSON) → 直接fetch + パース（無料・確実）
- HTML → Gemini SDK で抽出（必要最小限）
- Rate limit対策: 固定遅延 + exponential backoff

---

## 🏗️ ディレクトリ構造

```
public/
├── scripts/
│   ├── fetch-provider-info.ts              # CLIエントリーポイント
│   ├── lib/
│   │   ├── storage.ts                      # JSON保存ユーティリティ
│   │   ├── rate-limiter.ts                 # Gemini APIレート制限対策
│   │   ├── gemini-extractor.ts             # HTML → JSON変換
│   │   └── provider-fetchers/
│   │       ├── base-provider.ts            # 抽象基底クラス
│   │       └── anthropic-provider.ts       # Anthropic実装
│   └── types/
│       └── provider-info.ts                # 型定義
├── output/
│   └── provider-info/
│       └── anthropic/
│           ├── raw/                        # 生データ
│           │   ├── models-api-{ts}.json
│           │   ├── pricing-page-{ts}.html
│           │   └── pricing-extracted-{ts}.json
│           ├── processed/                  # 加工済み
│           │   └── provider-data-{ts}.json
│           └── reports/                    # レポート
│               └── report-{ts}.md
└── package.json                            # yarn scripts追加
```

---

## 🔄 データフロー

```
┌─────────────────────────────────────────────────────────┐
│         fetch-provider-info.ts (CLI)                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│     AnthropicProvider (extends BaseProvider)            │
└──┬──────────────┬─────────────┬──────────────┬─────────┘
   │              │             │              │
   ▼              ▼             ▼              ▼
┌─────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐
│ Models  │  │ Pricing  │  │  Gemini    │  │ Process  │
│ API     │  │ HTML     │  │  Extract   │  │ & Report │
│ (JSON)  │  │ (fetch)  │  │  (SDK)     │  │          │
└────┬────┘  └────┬─────┘  └─────┬──────┘  └────┬─────┘
     │            │              │              │
     └────────────┴──────────────┴──────────────┘
                         │
                         ▼
     ┌───────────────────────────────────────────┐
     │  Storage (JSON + Markdown)                │
     │  - raw/*                                  │
     │  - processed/provider-data-{ts}.json      │
     │  - reports/report-{ts}.md                 │
     └───────────────────────────────────────────┘
```

---

## 📦 データスキーマ

### Raw Models API Response

```typescript
// output/provider-info/anthropic/raw/models-api-{timestamp}.json
{
  "fetchedAt": "2026-01-02T12:34:56.789Z",
  "source": "https://api.anthropic.com/v1/models",
  "data": {
    "models": [
      {
        "id": "claude-opus-4-5-20251101",
        "name": "Claude Opus 4.5",
        "created": 1234567890
        // ... full API response
      }
    ]
  }
}
```

### Extracted Pricing Data (Gemini SDK出力)

```typescript
// output/provider-info/anthropic/raw/pricing-extracted-{timestamp}.json
{
  "fetchedAt": "2026-01-02T12:34:56.789Z",
  "source": "https://www.anthropic.com/pricing",
  "extractedBy": "gemini-2.5-flash",
  "data": {
    "models": [
      {
        "name": "Claude Opus 4.5",
        "inputPrice": "$15.00 / MTok",
        "outputPrice": "$75.00 / MTok",
        "contextWindow": "200K"
      }
    ]
  }
}
```

### Processed Provider Data (最終出力)

```typescript
// output/provider-info/anthropic/processed/provider-data-{timestamp}.json
{
  "provider": "anthropic",
  "generatedAt": "2026-01-02T12:34:56.789Z",
  "version": "1.0.0",
  "sources": {
    "modelsApi": "raw/models-api-1735891234567.json",
    "pricingExtract": "raw/pricing-extracted-1735891234567.json"
  },
  "models": [
    {
      "id": "claude-opus-4-5-20251101",
      "name": "Claude Opus 4.5",
      "agentName": "claude-opus-4-5",
      "maxTokens": 200000,
      "pricing": {
        "input": 15.0,   // per MTok
        "output": 75.0   // per MTok
      },
      "features": {
        "streaming": true,
        "functionCalling": true
      }
    }
  ]
}
```

---

## 🛠️ 実装ステップ

### Phase 1: Foundation (基盤)

#### 1. Type Definitions

**File:** `scripts/types/provider-info.ts`

全TypeScriptインターフェース定義:

- `ProviderConfig` - プロバイダー設定
- `RawApiResponse` - 生API応答
- `ExtractedPricing` - Gemini抽出結果
- `ProcessedProviderData` - 最終データ
- `ModelInfo` - モデル情報
- `FetchResult` - 取得結果

#### 2. Storage Utilities

**File:** `scripts/lib/storage.ts`

JSON保存ユーティリティ:

- `ensureDir(dirPath: string)` - ディレクトリ作成
- `saveJSON<T>(filePath: string, data: T)` - JSON保存
- `loadJSON<T>(filePath: string): T | null` - JSON読込
- `generateTimestamp(): string` - タイムスタンプ生成
- `buildOutputPath(provider, category, filename): string` - パス構築

**参考:** `scripts/fetch-x-thread.ts` (lines 230-246)

#### 3. Rate Limiter

**File:** `scripts/lib/rate-limiter.ts`

Gemini APIレート制限対策:

```typescript
interface RateLimiterConfig {
  delayMs: number; // 2000ms (デフォルト2秒)
  maxRetries: number; // 3回リトライ
  backoffMultiplier: number; // 2x exponential
  maxDelay: number; // 30000ms 最大待機
}

class RateLimiter {
  async waitForNextCall(): Promise<void>;
  async withRetry<T>(fn: () => Promise<T>): Promise<T>;
}
```

**戦略:**

- 固定遅延: 2秒間隔でGemini SDK呼び出し
- 429エラー時: exponential backoff
- コール数・タイムスタンプ追跡

#### 4. Gemini Extractor

**File:** `scripts/lib/gemini-extractor.ts`

Gemini SDKでHTML解析:

```typescript
class GeminiExtractor {
  constructor(apiKey: string, rateLimiter: RateLimiter);

  async extractPricingFromHTML(html: string): Promise<ExtractedPricing>;
  async extractStructuredData(html: string, schema: object): Promise<object>;
}
```

**機能:**

- Function callingで構造化出力
- System instructionでプロンプト最適化
- エラーハンドリング + リトライ

**参考:** `agent/test-agent.ts` (Gemini SDK + function calling)

**Function Calling例:**

```typescript
const tools = [
  {
    functionDeclarations: [
      {
        name: 'extract_pricing',
        description: 'Extract pricing information from HTML',
        parameters: {
          type: 'OBJECT',
          properties: {
            models: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  inputPrice: { type: 'STRING' },
                  outputPrice: { type: 'STRING' },
                  contextWindow: { type: 'STRING' },
                },
              },
            },
          },
        },
      },
    ],
  },
];
```

### Phase 2: Provider Implementation

#### 5. Base Provider

**File:** `scripts/lib/provider-fetchers/base-provider.ts`

抽象基底クラス:

```typescript
abstract class BaseProvider {
  abstract fetchRawData(): Promise<void>;
  abstract processData(): Promise<ProcessedProviderData>;
  abstract generateReport(): Promise<string>;

  async run(): Promise<void> {
    await this.fetchRawData();
    const processed = await this.processData();
    const report = await this.generateReport();
    // 全出力を保存
  }
}
```

#### 6. Anthropic Provider

**File:** `scripts/lib/provider-fetchers/anthropic-provider.ts`

Anthropic実装:

```typescript
class AnthropicProvider extends BaseProvider {
  private apiEndpoint = 'https://api.anthropic.com/v1/models';
  private pricingUrl = 'https://www.anthropic.com/pricing';

  async fetchRawData(): Promise<void> {
    // 1. Models API取得 (直接fetch)
    // 2. Pricing HTML取得
    // 3. Gemini SDKで価格情報抽出
    // 4. 全rawデータ保存
  }

  async processData(): Promise<ProcessedProviderData> {
    // Models API + Pricing をマージ
    // 標準スキーマに変換
  }

  async generateReport(): Promise<string> {
    // Markdownレポート生成
  }
}
```

**データソース:**

- **Models API:** https://api.anthropic.com/v1/models (JSON直接取得)
- **Pricing Page:** https://www.anthropic.com/pricing (Gemini SDK抽出)

**参考:** `scripts/fetch-x-thread.ts` (API取得、データ処理、保存)

### Phase 3: CLI Entry Point

#### 7. Main Script

**File:** `scripts/fetch-provider-info.ts`

```typescript
#!/usr/bin/env tsx

import 'dotenv/config';
import { AnthropicProvider } from './lib/provider-fetchers/anthropic-provider.js';
import { RateLimiter } from './lib/rate-limiter.js';
import { GeminiExtractor } from './lib/gemini-extractor.js';

async function main() {
  const args = process.argv.slice(2);

  // CLI args: --provider=anthropic, --dry-run
  const provider =
    args.find((a) => a.startsWith('--provider='))?.split('=')[1] || 'anthropic';
  const dryRun = args.includes('--dry-run');

  // API key検証
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY not found in .env');
  }

  // 初期化
  const rateLimiter = new RateLimiter({ delayMs: 2000 });
  const geminiExtractor = new GeminiExtractor(geminiApiKey, rateLimiter);

  // 実行
  if (provider === 'anthropic') {
    const fetcher = new AnthropicProvider(geminiExtractor);
    await fetcher.run();
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  console.log('✅ Provider info fetch completed');
}

main().catch(console.error);
```

**参考:** `scripts/fetch-x-thread.ts` (CLI arg parsing, error handling)

### Phase 4: Integration

#### 8. Yarn Scripts

**File:** `package.json`

`scripts`セクションに追加:

```json
{
  "fetch:providers": "tsx --tsconfig tsconfig.scripts.json scripts/fetch-provider-info.ts",
  "fetch:providers:dry-run": "tsx --tsconfig tsconfig.scripts.json scripts/fetch-provider-info.ts --dry-run"
}
```

---

## ⚡ Rate Limit対策詳細

### 設定

```typescript
interface RateLimiterConfig {
  delayMs: 2000; // 2秒固定遅延
  maxRetries: 3; // 最大3回リトライ
  backoffMultiplier: 2; // 各リトライで2x
  maxDelay: 30000; // 最大30秒待機
}
```

### ロジック

```typescript
class RateLimiter {
  private lastCallTime = 0;
  private callCount = 0;

  async waitForNextCall(): Promise<void> {
    const elapsed = Date.now() - this.lastCallTime;

    if (elapsed < this.config.delayMs) {
      const wait = this.config.delayMs - elapsed;
      console.log(`⏳ Rate limiting: waiting ${wait}ms...`);
      await delay(wait);
    }

    this.lastCallTime = Date.now();
    this.callCount++;
  }

  async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let retries = 0;
    while (retries <= this.config.maxRetries) {
      try {
        await this.waitForNextCall();
        return await fn();
      } catch (error) {
        if (is429Error(error) && retries < this.config.maxRetries) {
          const backoff = this.config.delayMs * Math.pow(2, retries);
          console.warn(`⚠️ Rate limit hit, retrying in ${backoff}ms...`);
          await delay(Math.min(backoff, this.config.maxDelay));
          retries++;
        } else {
          throw error;
        }
      }
    }
  }
}
```

---

## 🚨 エラーハンドリング

### API Fetch失敗

```typescript
try {
  const response = await fetch(url);
  if (!response.ok) {
    // エラー状態をJSON保存
    await saveJSON(errorPath, {
      error: `HTTP ${response.status}`,
      url,
      timestamp: new Date().toISOString(),
    });
  }
} catch (error) {
  // ネットワークエラー - 保存 & リトライ
}
```

### Gemini抽出失敗

```typescript
try {
  const extracted = await geminiExtractor.extractPricing(html);

  // データ検証
  if (!extracted.models || extracted.models.length === 0) {
    console.warn('⚠️ Incomplete extraction, saving raw HTML');
    await saveRawHTML(html, 'pricing-fallback.html');
  }
} catch (error) {
  // エラー + raw HTMLを保存（手動レビュー用）
  // 価格情報なしでも継続（Models APIは有効）
}
```

### リトライ戦略

- **ネットワークエラー:** 最大3回リトライ、exponential backoff
- **Rate limit (429):** 自動リトライ、長めの遅延
- **抽出エラー:** リトライなし、raw data保存
- **致命的エラー:** 停止、明確なエラーメッセージ

---

## 🔮 拡張性（将来対応）

### 設定駆動アプローチ

```typescript
// Future: provider-configs.json
{
  "anthropic": {
    "apiEndpoint": "https://api.anthropic.com/v1/models",
    "pricingUrl": "https://www.anthropic.com/pricing",
    "requiresAuth": false
  },
  "openai": {
    "apiEndpoint": "https://api.openai.com/v1/models",
    "pricingUrl": "https://openai.com/pricing",
    "requiresAuth": true,
    "authEnvVar": "OPENAI_API_KEY"
  }
}
```

### プラグインアーキテクチャ

```typescript
// scripts/lib/provider-fetchers/index.ts
export const PROVIDERS: Record<string, typeof BaseProvider> = {
  anthropic: AnthropicProvider,
  // Future: 'openai': OpenAIProvider,
  //         'google': GoogleProvider,
};

// メインスクリプト:
const ProviderClass = PROVIDERS[providerName];
const fetcher = new ProviderClass(geminiExtractor);
```

### 共有ユーティリティ

全プロバイダーで共有:

- RateLimiter（プロバイダー毎に設定可能）
- GeminiExtractor（HTML解析の再利用）
- Storage utilities（一貫したJSON出力）
- Report generator（テンプレート化Markdown）

---

## ✅ テスト手順

### 手動テスト

```bash
# 1. Dry-runテスト
yarn fetch:providers --provider=anthropic --dry-run

# 2. 実際の取得テスト
yarn fetch:providers --provider=anthropic

# 3. 出力ファイル確認
ls -la output/provider-info/anthropic/
cat output/provider-info/anthropic/reports/report-*.md
```

### 期待される出力

```
output/provider-info/anthropic/
├── raw/
│   ├── models-api-1735891234567.json
│   ├── pricing-page-1735891234567.html
│   └── pricing-extracted-1735891234567.json
├── processed/
│   └── provider-data-1735891234567.json
└── reports/
    └── report-1735891234567.md
```

---

## 📝 実装順序

1. ✅ Type definitions (`types/provider-info.ts`)
2. ✅ Storage utilities (`lib/storage.ts`)
3. ✅ Rate limiter (`lib/rate-limiter.ts`)
4. ✅ Gemini extractor (`lib/gemini-extractor.ts`)
5. ✅ Base provider (`lib/provider-fetchers/base-provider.ts`)
6. ✅ Anthropic provider (`lib/provider-fetchers/anthropic-provider.ts`)
7. ✅ Main script (`fetch-provider-info.ts`)
8. ✅ Update `package.json` with yarn scripts
9. ✅ Test with `--dry-run`
10. ✅ Test actual execution
11. ✅ Verify outputs

---

## 🎯 重要ファイル一覧

| File                                                  | Purpose                | Lines Est. |
| ----------------------------------------------------- | ---------------------- | ---------- |
| `scripts/types/provider-info.ts`                      | 全型定義               | ~100       |
| `scripts/lib/storage.ts`                              | JSON保存ユーティリティ | ~80        |
| `scripts/lib/rate-limiter.ts`                         | Rate limit制御         | ~100       |
| `scripts/lib/gemini-extractor.ts`                     | Gemini SDK HTML解析    | ~150       |
| `scripts/lib/provider-fetchers/base-provider.ts`      | 抽象基底クラス         | ~80        |
| `scripts/lib/provider-fetchers/anthropic-provider.ts` | Anthropic実装          | ~200       |
| `scripts/fetch-provider-info.ts`                      | CLIエントリーポイント  | ~100       |

**Total:** ~810 lines

---

## 🚀 将来の機能拡張

1. **キャッシング**: タイムスタンプベースで再取得スキップ
2. **差分レポート**: 前回取得との比較
3. **自動更新**: provider2agent.tsへのPR自動生成
4. **並列取得**: 全プロバイダー同時実行
5. **Webhook通知**: 価格変更時の通知
6. **スキーマ検証**: Zod等での抽出データ検証
7. **ユニットテスト**: 各コンポーネントのテスト追加

---

## 📚 参考パターン

- **Gemini SDK使用:** `agent/test-agent.ts`, `agent/multi-agent-planner.ts`
- **API取得・保存:** `scripts/fetch-x-thread.ts`
- **データ処理:** `scripts/translate-docs.ts`
- **Storage:** `scripts/fetch-x-thread.ts` (lines 230-246)
- **エラーハンドリング:** `scripts/translate-docs.ts` (lines 297-321)
