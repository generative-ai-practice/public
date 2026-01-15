#!/usr/bin/env tsx

/**
 * X スレッドのJSONをMarkdownに変換するスクリプト
 *
 * 使用方法:
 *   yarn thread:md <json_file_path>
 *
 * 例:
 *   yarn thread:md output/x-threads/thread_1234567890_1766035338419.json
 */

import type { XThreadResult } from './types/x-api';

/**
 * JSONファイルをMarkdownに変換する
 */
export async function convertToMarkdown(jsonPath: string): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');

  // JSONファイルを読み込む
  const jsonContent = await fs.readFile(jsonPath, 'utf-8');
  const data: XThreadResult = JSON.parse(jsonContent);

  const lines: string[] = [];

  // タイトル
  lines.push(`# X Thread by @${data.author?.username || 'unknown'}`);
  lines.push('');

  // メタ情報
  lines.push('## メタ情報');
  lines.push('');
  lines.push(
    `- **作成者**: @${data.author?.username || 'unknown'} (${data.author?.name || 'unknown'})`
  );
  lines.push(`- **投稿日時**: ${data.mainTweet.created_at || 'unknown'}`);
  lines.push(`- **スレッド件数**: ${data.threadTweets.length + 1} 件`);
  lines.push(`- **メディア件数**: ${data.media?.length || 0} 件`);
  lines.push('');

  // メインポスト
  lines.push('## メインポスト');
  lines.push('');
  lines.push(data.mainTweet.text);
  lines.push('');

  // メインポストのメディア
  if (data.mainTweet.attachments?.media_keys) {
    const mainMediaKeys = data.mainTweet.attachments.media_keys;
    const mainMedia = data.media?.filter((m) =>
      mainMediaKeys.includes(m.media_key)
    );

    if (mainMedia && mainMedia.length > 0) {
      lines.push('### 添付メディア');
      lines.push('');
      mainMedia.forEach((media, index) => {
        if (media.type === 'photo' && media.url) {
          lines.push(`![画像${index + 1}](${media.url})`);
          if (media.alt_text) {
            lines.push(`> ${media.alt_text}`);
          }
          lines.push('');
        } else if (media.type === 'video' || media.type === 'animated_gif') {
          lines.push(`**ビデオ/GIF**: ${media.media_key}`);
          if (media.preview_image_url) {
            lines.push(`![プレビュー](${media.preview_image_url})`);
          }
          lines.push('');
        }
      });
    }
  }

  lines.push(`_投稿日時: ${data.mainTweet.created_at}_`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 連投ポスト
  if (data.threadTweets.length > 0) {
    lines.push('## 連投ポスト');
    lines.push('');

    data.threadTweets.forEach((tweet, index) => {
      lines.push(`### ${index + 1}. ポスト`);
      lines.push('');
      lines.push(tweet.text);
      lines.push('');

      // ポストのメディア
      if (tweet.attachments?.media_keys) {
        const tweetMediaKeys = tweet.attachments.media_keys;
        const tweetMedia = data.media?.filter((m) =>
          tweetMediaKeys.includes(m.media_key)
        );

        if (tweetMedia && tweetMedia.length > 0) {
          lines.push('#### 添付メディア');
          lines.push('');
          tweetMedia.forEach((media, mediaIndex) => {
            if (media.type === 'photo' && media.url) {
              lines.push(`![画像${mediaIndex + 1}](${media.url})`);
              if (media.alt_text) {
                lines.push(`> ${media.alt_text}`);
              }
              lines.push('');
            } else if (
              media.type === 'video' ||
              media.type === 'animated_gif'
            ) {
              lines.push(`**ビデオ/GIF**: ${media.media_key}`);
              if (media.preview_image_url) {
                lines.push(`![プレビュー](${media.preview_image_url})`);
              }
              lines.push('');
            }
          });
        }
      }

      lines.push(`_投稿日時: ${tweet.created_at}_`);
      lines.push('');

      if (index < data.threadTweets.length - 1) {
        lines.push('---');
        lines.push('');
      }
    });
  }

  // フッター
  lines.push('---');
  lines.push('');
  lines.push(
    `_このMarkdownファイルは [fetch-x-thread](scripts/fetch-x-thread.ts) により自動生成されました。_`
  );
  lines.push('');

  return lines.join('\n');
}

/**
 * Markdownファイルを保存する
 */
export async function saveMarkdown(
  markdownContent: string,
  jsonPath: string
): Promise<string> {
  const path = await import('path');
  const fs = await import('fs/promises');

  // 出力ファイルパスを生成 (同じディレクトリに .md として保存)
  const parsedPath = path.parse(jsonPath);
  const mdFileName = parsedPath.name + '.md';
  const mdFilePath = path.join(parsedPath.dir, mdFileName);

  await fs.writeFile(mdFilePath, markdownContent, 'utf-8');

  return mdFilePath;
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
使用方法:
  yarn thread:md <json_file_path>

例:
  yarn thread:md output/x-threads/thread_1234567890_1766035338419.json
    `);
    process.exit(0);
  }

  // パストラバーサル攻撃対策: パスを正規化して検証
  const path = await import('path');
  const jsonPath = path.resolve(args[0]);
  const cwd = process.cwd();

  if (!jsonPath.startsWith(cwd)) {
    console.error('❌ エラー: 無効なファイルパスです');
    console.error(`   カレントディレクトリ外のファイルにはアクセスできません`);
    process.exit(1);
  }

  try {
    console.log(`📄 JSONファイルを読み込み中: ${jsonPath}`);

    const markdownContent = await convertToMarkdown(jsonPath);

    console.log('✅ Markdown変換完了');

    const savedPath = await saveMarkdown(markdownContent, jsonPath);

    console.log(`💾 Markdownファイルを保存しました: ${savedPath}`);
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

// 直接実行された場合のみ main() を呼び出す
const isDirectRun =
  process.argv[1]?.includes('convert-thread-to-md') ||
  process.argv[1]?.endsWith('x:md');
if (isDirectRun) {
  main();
}
