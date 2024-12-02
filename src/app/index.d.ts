import type { profile, user } from '@prisma/client';
import { MiUser } from '@/api/_misskey-entities/user';

interface MiAuthSession {
  token: string;
  url: string;
}

interface MiApiError {
  error: {
    message: string;
    code: string;
    id: string;
    kind: 'client' | 'server';
  };
}

/** Misskey 의 /api/auth/session/userkey 에서 돌아오는 형식 */
export interface misskeyAccessKeyApiResponse {
  accessToken: string;
  user: MiUser;
}

export interface questions {
  id: number;
  question: string;
  questioner: string | null;
  questionee: profile;
  questioneeHandle: string;
  questionedAt: Date;
}

export interface MkNoteAnswers {
  i: string;
  cw: string;
  text: string;
  visibility: 'public' | 'home' | 'followers';
}

export interface mastodonTootAnswers {
  spoiler_text: string;
  status: string;
  visibility: 'public' | 'unlisted' | 'private';
}

export interface postQuestion {
  question: string;
  questioner: string;
  answer: string;
  answeredPerson: user;
  answeredPersonHandle: string;
}

export interface DBpayload {
  account: user['account'];
  accountLower: user['accountLower'];
  hostName: user['hostName'];
  handle: user['handle'];
  name: profile['name'];
  avatarUrl: profile['avatarUrl'];
  accessToken: user['token'];
  userId: user['userId'];
}
