'use server';

import type { mastodonTootAnswers, MkNoteAnswers, typedAnswer } from '@/app';
import { verifyToken } from '@/app/api/_utils/jwt/verify-jwt';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { question, server, user } from '@prisma/client';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';

export async function getQuestion(id: number) {
  const prisma = GetPrismaClient.getClient();

  const findWithId = await prisma.question.findUnique({
    where: {
      id: id,
    },
  });

  return findWithId;
}

export async function postAnswer(questionId: question['id'] | null, typedAnswer: typedAnswer) {
  const postLogger = new Logger('postAnswer');
  const prisma = GetPrismaClient.getClient();
  const cookieStore = await cookies();
  const jwtToken = cookieStore.get('jwtToken')?.value;
  let tokenPayload;
  // JWT 토큰 검증
  try {
    tokenPayload = await verifyToken(jwtToken);
  } catch (err) {
    return sendApiError(401, 'Unauthorized');
  }
  if (!questionId) {
    return sendApiError(400, 'Bad Request');
  }
  const q = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });
  if (q.questioneeHandle !== tokenPayload.handle) {
    throw new Error(`This question is not for you`);
  }
  const answeredUser = await prisma.user.findUniqueOrThrow({
    where: {
      handle: tokenPayload.handle,
    },
  });
  const server = await prisma.server.findUniqueOrThrow({
    where: {
      instances: answeredUser.hostName,
    },
  });

  const userSettings = await prisma.profile.findUniqueOrThrow({
    where: {
      handle: tokenPayload.handle,
    },
  });
  const createdAnswer = await prisma.answer.create({
    data: {
      question: q.question,
      questioner: q.questioner,
      answer: typedAnswer.answer,
      answeredPersonHandle: tokenPayload.handle,
      nsfwedAnswer: typedAnswer.nsfwedAnswer,
    },
  });
  const answerUrl = `${process.env.WEB_URL}/main/user/${answeredUser.handle}/${createdAnswer.id}`;

  if (!userSettings.stopPostAnswer) {
    let title;
    let text;
    if (typedAnswer.nsfwedAnswer === true) {
      title = `⚠️ 이 질문은 NSFW한 질문이에요! #neo_quesdon`;
      if (q.questioner) {
        text = `질문자:${q.questioner}\nQ:${q.question}\nA: ${typedAnswer.answer}\n#neo_quesdon ${answerUrl}`;
      } else {
        text = `Q: ${q.question}\nA: ${typedAnswer.answer}\n#neo_quesdon ${answerUrl}`;
      }
    } else {
      title = `Q: ${q.question} #neo_quesdon`;
      if (q.questioner) {
        text = `질문자:${q.questioner}\nA: ${typedAnswer.answer}\n#neo_quesdon ${answerUrl}`;
      } else {
        text = `A: ${typedAnswer.answer}\n#neo_quesdon ${answerUrl}`;
      }
    }
    try {
      switch (server.instanceType) {
        case 'misskey':
        case 'cherrypick':
          await mkMisskeyNote({ user: answeredUser, server: server }, { title: title, text: text, visibility: typedAnswer.visibility });
          break;
        case 'mastodon':
          await mastodonToot({ user: answeredUser }, { title: title, text: text, visibility: typedAnswer.visibility });
          break;
        default:
          break;
      }
    } catch {
      postLogger.warn('답변 작성 실패!');
      /// 미스키/마스토돈에 글 올리는데 실패했으면 다시 answer 삭제
      await prisma.answer.delete({ where: { id: createdAnswer.id } });
      throw new Error('답변 작성 실패!');
    }
  }

  await prisma.question.delete({
    where: {
      id: q.id,
    },
  });

  postLogger.log('Created new answer:', answerUrl);
}

async function mkMisskeyNote(
  { user, server }: {
    user: user,
    server: server,
  },
  { title, text, visibility }: {
    title: string,
    text: string,
    visibility: MkNoteAnswers['visibility'],
  }
) {
  const NoteLogger = new Logger('mkMisskeyNote');
  // 미스키 CW길이제한 처리
  if (title.length > 100) {
    title = title.substring(0, 90) + '.....';
  }
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
      await prisma.user.update({ where: { handle: user.handle }, data: { jwtIndex: (user.jwtIndex + 1) } });
      throw new Error('Note Create Fail! (Token Revoked)');
    }
    else if (!res.ok) {
      throw new Error(`Note Create Fail! ${await res.text()}`);
    } else {
      NoteLogger.log(`Note Created! ${res.statusText}`);
    }
  } catch (err) {
    NoteLogger.warn(err);
    throw err;
  }
}

async function mastodonToot(
  { user }: {
    user: user,
  },
  { title, text, visibility }: {
    title: string,
    text: string,
    visibility: MkNoteAnswers['visibility'],
  }
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
      await prisma.user.update({ where: { handle: user.handle }, data: { jwtIndex: (user.jwtIndex + 1) } });
      throw new Error('Toot Create Fail! (Token Revoked)');
    }
    else if (!res.ok) {
      throw new Error(`HTTP Error! status:${await res.text()}`);
    } else {
      tootLogger.log(`Toot Created! ${res.statusText}`);
    }
  } catch (err) {
    tootLogger.warn(`Toot Create Fail!`, err);
    throw err;
  }
}

export async function deleteQuestion(id: number) {
  const prisma = GetPrismaClient.getClient();
  const cookieStore = await cookies();
  const jwtToken = cookieStore.get('jwtToken')?.value;
  try {
    const tokenPayload = await verifyToken(jwtToken);
    await prisma.$transaction(async (tr) => {
      const q = await tr.question.findUniqueOrThrow({ where: { id: id } });
      if (q.questioneeHandle !== tokenPayload.handle) {
        throw new Error(`You Can't delete this question`);
      }
      await tr.question.delete({
        where: {
          id: id,
        },
      });
    });
  } catch (err) {
    throw new Error(`JWT Token Verification Error: ${err}`);
  }
}
