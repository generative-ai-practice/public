import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('APIキーがありません');

const genAI = new GoogleGenerativeAI(apiKey);

// --- 1. ツール（実際の関数）のロジック ---
// AIが「計算したい」と言った時に実行される関数
function addNumbers(a: number, b: number): number {
  console.log(`\n⚙️ ツール実行: ${a} + ${b} を計算中...`); // 実際に動いたか確認用
  return a + b;
}

// --- 2. ツール定義（AIへの説明書） ---
// AIに「僕はこの関数を持ってるよ」と教えるためのスキーマ
const tools = [
  {
    functionDeclarations: [
      {
        name: 'add_numbers',
        description: '2つの数値を足し算します。',
        parameters: {
          type: 'OBJECT',
          properties: {
            a: { type: 'NUMBER', description: '最初の数字' },
            b: { type: 'NUMBER', description: '次の数字' },
          },
          required: ['a', 'b'],
        },
      },
    ],
  },
];

async function main() {
  // --- 3. エージェントの初期化 ---
  // tools を渡すことで、ただのLLMから「エージェント」になります
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: tools,
  });

  const chat = model.startChat();

  // ユーザーの指示
  const userPrompt = '5000兆 + 2500兆 はいくつ？';
  console.log(`👤 ユーザー: ${userPrompt}`);

  // --- 4. 思考と行動のループ ---

  // まずAIに投げかける
  const result1 = await chat.sendMessage(userPrompt);
  const call = result1.response.functionCalls()?.[0];

  // AIが「関数を使いたい」と言ってきたかチェック
  if (call) {
    const { name, args } = call;

    if (name === 'add_numbers') {
      // AIの指示通りに関数を実行
      const functionResult = addNumbers(args.a as number, args.b as number);

      // 結果をAIに返す (Function Response)
      const result2 = await chat.sendMessage([
        {
          functionResponse: {
            name: 'add_numbers',
            response: { result: functionResult },
          },
        },
      ]);

      // 最終回答を表示
      console.log(`🤖 エージェント: ${result2.response.text()}`);
    }
  } else {
    // ツールを使わずに答えた場合
    console.log(`🤖 エージェント: ${result1.response.text()}`);
  }
}

main();
