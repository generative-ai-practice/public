import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

// --- Agent 1: 企画担当 (攻めの姿勢) ---
const plannerAgent = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: `
    あなたは大胆なイベントプランナーです。
    ユーザーからテーマを渡されたら、誰も思いつかないようなユニークで派手な企画案を3つ考えてください。
    予算や実現可能性は一旦無視して、面白さを最優先してください。
  `,
});

// --- Agent 2: レビュー担当 (守りの姿勢) ---
const reviewerAgent = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: `
    あなたは現実的なプロジェクトマネージャーです。
    プランナーから提出された企画案を読み、以下の処理を行ってください。
    1. 最も実現可能性が高く、かつ効果的な案を1つ選ぶ。
    2. その案を実現するための具体的な課題（予算、法律、技術など）を指摘する。
    3. 最終的に「実施すべきプロジェクト概要」としてまとめる。
  `,
});

async function main() {
  const theme = "AIを使った新しい夏祭り";

  console.log(`\n🎯 テーマ: ${theme}\n`);
  console.log("-----------------------------------");

  // Step 1: 企画担当エージェントに企画を考えてもらう
  console.log("\n💡 企画担当エージェントが考案中...\n");
  const plannerChat = plannerAgent.startChat();
  const plannerResult = await plannerChat.sendMessage(theme);
  const proposals = plannerResult.response.text();

  console.log("【企画案】\n");
  console.log(proposals);
  console.log("\n-----------------------------------");

  // Step 2: レビュー担当エージェントに企画案を評価してもらう
  console.log("\n🔍 レビュー担当エージェントが評価中...\n");
  const reviewerChat = reviewerAgent.startChat();
  const reviewerResult = await reviewerChat.sendMessage(
    `以下の企画案を評価してください:\n\n${proposals}`
  );
  const finalPlan = reviewerResult.response.text();

  console.log("【最終プロジェクト概要】\n");
  console.log(finalPlan);
  console.log("\n-----------------------------------\n");
}

main();
