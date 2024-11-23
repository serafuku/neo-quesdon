import { CreateQuestionDto } from '@/app/_dto/create_question/create-question.dto';
import type { user } from '@prisma/client';
import { type NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../_utils/jwt/verify-jwt';
import { validateStrict } from '@/utils/validator/strictValidator';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { RateLimiterService } from '@/app/api/_utils/ratelimiter/rateLimiter';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { getIpFromRequest } from '@/app/api/_utils/getIp/get-ip-from-Request';
import { getIpHash } from '@/app/api/_utils/getIp/get-ip-hash';
const logger = new Logger('create-question');

export async function POST(req: NextRequest) {
  const prisma = GetPrismaClient.getClient();
  const token = req.cookies.get('jwtToken')?.value;
  const tokenPayload = await verifyToken(token)
    .then((payload) => payload)
    .catch(() => {});
  if (tokenPayload) {
    const limiter = RateLimiterService.getLimiter();
    const limited = await limiter.limit(`create-question-${tokenPayload.handle}`, {
      bucket_time: 100,
      req_limit: 10,
    });
    if (limited) {
      return sendApiError(429, '요청 제한에 도달했습니다!');
    }
  } else {
    const limiter = RateLimiterService.getLimiter();
    const ipHash = getIpHash(getIpFromRequest(req));
    const limited = await limiter.limit(`create-question-${ipHash}`, {
      bucket_time: 100,
      req_limit: 10,
    });
    if (limited) {
      return sendApiError(429, '요청 제한에 도달했습니다!');
    }
  }

  try {
    let data;
    try {
      data = await validateStrict(CreateQuestionDto, await req.json());
    } catch (errors) {
      logger.warn(errors);
      return sendApiError(400, `${errors}`);
    }

    const questionee_user = await prisma.user.findUniqueOrThrow({
      where: {
        handle: data.questionee,
      },
    });
    const questionee_profile = await prisma.profile.findUniqueOrThrow({
      where: {
        handle: questionee_user?.handle,
      },
    });

    if (questionee_profile.stopAnonQuestion && !data.questioner) {
      logger.debug('The user has prohibits anonymous questions.');
      throw new Error('The user has prohibits anonymous questions.');
    } else if (questionee_profile.stopNewQuestion) {
      logger.debug('User stops NewQuestion');
      throw new Error('User stops NewQuestion');
    }

    // 제시된 questioner 핸들이 JWT토큰의 핸들과 일치하는지 검사
    if (data.questioner) {
      try {
        if (!tokenPayload) {
          throw new Error(`No Auth Token`);
        }
        if (tokenPayload.handle.toLowerCase() !== data.questioner.toLowerCase()) {
          throw new Error(`Token and questioner not match`);
        }
      } catch (err) {
        logger.warn(`questioner verify ERROR! ${err}`);
        return sendApiError(403, `${err}`);
      }
    }

    //질문 생성
    const newQuestion = await prisma.question.create({
      data: {
        question: data.question,
        questioner: data.questioner,
        questioneeHandle: data.questionee,
      },
    });

    const userSettings = await prisma.profile.findUnique({
      where: {
        handle: data.questionee,
      },
    });

    if (userSettings && userSettings.stopNotiNewQuestion === true) {
      // 알림 전송 스킵
    } else {
      // 알림 전송
      const url = `${process.env.WEB_URL}/main/questions`;
      sendNotify(questionee_user, data.questioner, newQuestion.question, url);
    }

    // notify send 기다라지 않고 200반환
    return NextResponse.json({}, { status: 200 });
  } catch (err) {
    return NextResponse.json(`Error! ${err}`, { status: 500 });
  }
}

async function sendNotify(questionee: user, questioner: string | null, question: string, url: string): Promise<void> {
  const notify_host = process.env.NOTI_HOST;
  logger.log(`try to send notification to ${questionee.handle}`);
  try {
    const res = await fetch(`https://${notify_host}/api/notes/create`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.NOTI_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visibleUserIds: [questionee.userId],
        visibility: 'specified',
        text: `${questionee.handle} <네오-퀘스돈> 새로운 질문이에요!\n질문자: ${questioner ? `\`${questioner}\`` : '익명의 질문자'}\nQ. ${question}\n ${url}`,
      }),
    });
    if (!res.ok) {
      throw new Error(`Note create error ${await res.text()}`);
    } else {
      logger.log(`Notification Sent to ${questionee.handle}`);
    }
  } catch (error) {
    logger.error('Post-question: fail to send notify: ', error);
  }
}
