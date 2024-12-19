import { mastodonTootAnswers, MkNoteAnswers } from '@/app';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { user } from '@prisma/client';

export async function mastodonToot(
  {
    user,
  }: {
    user: user;
  },
  {
    title,
    text,
    visibility,
  }: {
    title: string;
    text: string;
    visibility: MkNoteAnswers['visibility'];
  },
) {
  const tootLogger = new Logger('mastodonToot');
  let newVisibility: 'public' | 'unlisted' | 'private';
  switch (visibility) {
    case 'public':
      newVisibility = 'public';
      break;
    case 'home':
      newVisibility = 'unlisted';
      break;
    case 'followers':
      newVisibility = 'private';
      break;
    default:
      newVisibility = 'public';
      break;
  }
  const newAnswerToot: mastodonTootAnswers = {
    spoiler_text: title,
    status: text,
    visibility: newVisibility,
  };
  try {
    const res = await fetch(`https://${user.hostName}/api/v1/statuses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newAnswerToot),
    });
    if (res.status === 401 || res.status === 403) {
      tootLogger.warn('User Revoked Access token. JWT를 Revoke합니다.. Detail:', await res.text());
      const prisma = GetPrismaClient.getClient();
      await prisma.user.update({ where: { handle: user.handle }, data: { jwtIndex: user.jwtIndex + 1 } });
      throw new Error('Toot Create Fail! (Token Revoked)');
    } else if (!res.ok) {
      throw new Error(`HTTP Error! status:${await res.text()}`);
    } else {
      tootLogger.log(`Toot Created! ${res.statusText}`);
    }
  } catch (err) {
    tootLogger.warn(`Toot Create Fail!`, err);
    throw err;
  }
}
