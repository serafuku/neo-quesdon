import { MkNoteAnswers } from '@/app';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { createHash } from 'crypto';
import { user, server } from '@prisma/client';

export async function mkMisskeyNote(
  {
    user,
    server,
  }: {
    user: user;
    server: server;
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
  const NoteLogger = new Logger('mkMisskeyNote');

  const i = createHash('sha256')
    .update(user.token + server.appSecret, 'utf-8')
    .digest('hex');
  const newAnswerNote: MkNoteAnswers = {
    i: i,
    cw: title,
    text: text,
    visibility: visibility,
  };
  try {
    const res = await fetch(`https://${user.hostName}/api/notes/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${i}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newAnswerNote),
    });
    if (res.status === 401 || res.status === 403) {
      NoteLogger.warn('User Revoked Access token. JWT를 Revoke합니다... Detail:', await res.text());
      const prisma = GetPrismaClient.getClient();
      await prisma.user.update({ where: { handle: user.handle }, data: { jwtIndex: user.jwtIndex + 1 } });
      throw new Error('Note Create Fail! (Token Revoked)');
    } else if (!res.ok) {
      throw new Error(`Note Create Fail! ${await res.text()}`);
    } else {
      NoteLogger.log(`Note Created! ${res.statusText}`);
    }
  } catch (err) {
    NoteLogger.warn(err);
    throw err;
  }
}
