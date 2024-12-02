import { mastodonEmojiModel } from '@/app/_dto/fetch-name-with-emoji/fetch-name-with-emoji.dto';

/**
 * Mastodon /api/v1/accounts/verify_credentials 에서 돌아오는 응답중에 필요한 것만 추린것
 * 아마도.. .문제 없겠지?
 */
export type MastodonUser = {
  id: string;
  username: string;
  acct: string;
  display_name?: string | null;
  locked: boolean;
  bot: boolean;
  created_at: string;
  url: string;
  avatar: string | null;
  avatar_static?: string | null;
  header: string | null;
  header_static?: string | null;
  followers_count?: number;
  following_count?: number;
  statuses_count?: number;
  emojis: mastodonEmojiModel[];
};
