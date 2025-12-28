/**
 * X API (Twitter API v2) の型定義
 */

export interface XMedia {
  media_key: string;
  type: 'photo' | 'video' | 'animated_gif';
  url?: string;
  preview_image_url?: string;
  width?: number;
  height?: number;
  duration_ms?: number;
  alt_text?: string;
}

export interface XTweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  conversation_id?: string;
  in_reply_to_user_id?: string;
  attachments?: {
    media_keys?: string[];
  };
  referenced_tweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to';
    id: string;
  }>;
}

export interface XUser {
  id: string;
  name: string;
  username: string;
}

export interface XThreadResult {
  mainTweet: XTweet;
  threadTweets: XTweet[];
  author?: XUser;
  media?: XMedia[];
}

export interface FetchThreadOptions {
  tweetId: string;
  includeReplies?: boolean;
  maxResults?: number;
  downloadMedia?: boolean;
}
