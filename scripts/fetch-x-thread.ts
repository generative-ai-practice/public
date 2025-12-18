#!/usr/bin/env tsx

/**
 * X (Twitter) のスレッド取得スクリプト
 *
 * 使用方法:
 *   yarn fetch:thread <tweet_id>
 *   yarn fetch:thread <tweet_id> --with-replies
 *
 * 例:
 *   yarn fetch:thread 1234567890123456789
 *   yarn fetch:thread 1234567890123456789 --with-replies
 */

import 'dotenv/config';
import { TwitterApi } from 'twitter-api-v2';
import type {
  FetchThreadOptions,
  XThreadResult,
  XMedia,
} from './types/x-api';

/**
 * メディアをダウンロードする
 */
async function downloadMedia(
  media: XMedia[],
  tweetId: string
): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const outputDir = path.join(process.cwd(), 'output', 'x-threads', tweetId);
  await fs.mkdir(outputDir, { recursive: true });

  console.log(`\n📥 メディアをダウンロード中...`);

  for (const [index, item] of media.entries()) {
    if (item.type !== 'photo' || !item.url) {
      if (item.type === 'video' || item.type === 'animated_gif') {
        console.log(
          `   [${index + 1}/${media.length}] ⚠️  ビデオ/GIFはダウンロードできません: ${item.media_key}`
        );
      }
      continue;
    }

    try {
      const response = await fetch(item.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const extension = item.url.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `${item.media_key}.${extension}`;
      const filepath = path.join(outputDir, filename);

      await fs.writeFile(filepath, Buffer.from(buffer));

      console.log(
        `   [${index + 1}/${media.length}] ✅ ${filename} (${(buffer.byteLength / 1024).toFixed(2)} KB)`
      );
    } catch (error) {
      console.error(
        `   [${index + 1}/${media.length}] ❌ ダウンロード失敗: ${item.media_key}`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.log(`\n💾 メディア保存先: ${outputDir}`);
}

/**
 * X スレッドを取得する
 */
async function fetchThread(
  options: FetchThreadOptions
): Promise<XThreadResult> {
  const bearerToken = process.env.X_BEARER_TOKEN;

  if (!bearerToken) {
    throw new Error(
      'X_BEARER_TOKEN が設定されていません。.env ファイルを確認してください。'
    );
  }

  const client = new TwitterApi(bearerToken);

  console.log(`🔍 ポストを取得中: ${options.tweetId}`);
  console.log(`[API呼び出し 1/2] メインポストを取得...`);

  // 1. メインのポストを取得
  const mainTweetResponse = await client.v2.singleTweet(options.tweetId, {
    expansions: ['author_id', 'referenced_tweets.id', 'attachments.media_keys'],
    'tweet.fields': [
      'conversation_id',
      'created_at',
      'in_reply_to_user_id',
      'referenced_tweets',
      'attachments',
    ],
    'user.fields': ['name', 'username'],
    'media.fields': [
      'type',
      'url',
      'preview_image_url',
      'width',
      'height',
      'duration_ms',
      'alt_text',
    ],
  });

  const mainTweet = mainTweetResponse.data;
  const author = mainTweetResponse.includes?.users?.[0];

  console.log(`✅ メインポスト取得完了`);
  console.log(`   作成者: @${author?.username || 'unknown'}`);
  console.log(`   本文: ${mainTweet.text.substring(0, 50)}...`);

  // 2. 会話IDで同じユーザーの連投を検索
  const conversationId = mainTweet.conversation_id || mainTweet.id;
  const username = author?.username;

  if (!username) {
    console.warn('⚠️  作成者情報が取得できませんでした');
    return {
      mainTweet,
      threadTweets: [],
      author,
    };
  }

  console.log(`\n🔍 スレッドを検索中...`);
  console.log(`[API呼び出し 2/2] スレッドを検索...`);

  const query = options.includeReplies
    ? `conversation_id:${conversationId}`
    : `conversation_id:${conversationId} from:${username}`;

  const threadResponse = await client.v2.search(query, {
    expansions: ['attachments.media_keys'],
    'tweet.fields': [
      'created_at',
      'in_reply_to_user_id',
      'conversation_id',
      'attachments',
    ],
    'media.fields': [
      'type',
      'url',
      'preview_image_url',
      'width',
      'height',
      'duration_ms',
      'alt_text',
    ],
    max_results: options.maxResults || 100,
    sort_order: 'recency',
  });

  const threadTweets = threadResponse.data.data || [];

  console.log(`✅ スレッド取得完了: ${threadTweets.length} 件`);

  // メディア情報を収集
  const allMedia: XMedia[] = [];
  if (mainTweetResponse.includes?.media) {
    allMedia.push(...(mainTweetResponse.includes.media as XMedia[]));
  }
  if (threadResponse.includes?.media) {
    allMedia.push(...(threadResponse.includes.media as XMedia[]));
  }

  if (allMedia.length > 0) {
    console.log(`📷 メディア取得完了: ${allMedia.length} 件`);
  }

  // メディアをダウンロード
  if (options.downloadMedia && allMedia.length > 0) {
    await downloadMedia(allMedia, options.tweetId);
  }

  return {
    mainTweet,
    threadTweets: threadTweets
      .filter((tweet) => tweet.id !== mainTweet.id)
      .sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime()
      ),
    author,
    media: allMedia,
  };
}

/**
 * 結果を表示する
 */
function displayResult(result: XThreadResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('📝 スレッド取得結果');
  console.log('='.repeat(80));

  console.log(`\n👤 作成者: @${result.author?.username || 'unknown'}`);
  console.log(`📊 スレッド件数: ${result.threadTweets.length + 1} 件\n`);

  console.log('--- メインポスト ---');
  console.log(result.mainTweet.text);
  console.log(`(${result.mainTweet.created_at || 'unknown'})\n`);

  if (result.threadTweets.length > 0) {
    console.log('--- 連投ポスト ---');
    result.threadTweets.forEach((tweet, index) => {
      console.log(`\n[${index + 1}]`);
      console.log(tweet.text);
      console.log(`(${tweet.created_at || 'unknown'})`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * JSON ファイルに保存する
 */
async function saveToFile(
  result: XThreadResult,
  tweetId: string
): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const outputDir = path.join(process.cwd(), 'output', 'x-threads');
  await fs.mkdir(outputDir, { recursive: true });

  const filename = `thread_${tweetId}_${Date.now()}.json`;
  const filepath = path.join(outputDir, filename);

  await fs.writeFile(filepath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`\n💾 保存完了: ${filepath}`);
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
使用方法:
  yarn fetch:thread <tweet_id> [options]

オプション:
  --with-replies    他ユーザーからの返信も含める
  --max <number>    取得する最大件数 (デフォルト: 100)
  --save            結果をJSONファイルに保存
  --download-media  画像をダウンロード

例:
  yarn fetch:thread 1234567890123456789
  yarn fetch:thread 1234567890123456789 --with-replies --save
  yarn fetch:thread 1234567890123456789 --download-media --save
    `);
    process.exit(0);
  }

  const tweetId = args[0];
  const includeReplies = args.includes('--with-replies');
  const shouldSave = args.includes('--save');
  const downloadMedia = args.includes('--download-media');
  const maxResultsIndex = args.indexOf('--max');
  const maxResults =
    maxResultsIndex >= 0 ? parseInt(args[maxResultsIndex + 1], 10) : 100;

  try {
    const result = await fetchThread({
      tweetId,
      includeReplies,
      maxResults,
      downloadMedia,
    });

    displayResult(result);

    if (shouldSave) {
      await saveToFile(result, tweetId);
    }
  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
