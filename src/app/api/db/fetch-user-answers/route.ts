import { FetchUserAnswersDto } from '@/app/_dto/fetch-user-answers/fetch-user-answers.dto';
import { validateStrict } from '@/utils/validator/strictValidator';
import { NextRequest, NextResponse } from 'next/server';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { RateLimiterService } from '@/api/_utils/ratelimiter/rateLimiter';
import { getIpHash } from '@/api/_utils/getIp/get-ip-hash';
import { getIpFromRequest } from '@/api/_utils/getIp/get-ip-from-Request';
import { sendApiError } from '@/api/_utils/apiErrorResponse/sendApiError';

const logger = new Logger('fetch-user-answer');
export async function POST(req: NextRequest) {
  const prisma = GetPrismaClient.getClient();
  try {
    let data;
    try {
      data = await validateStrict(FetchUserAnswersDto, await req.json());
    } catch (err) {
      return sendApiError(400, `${err}`);
    }

    const limiter = RateLimiterService.getLimiter();
    const ipHash = getIpHash(getIpFromRequest(req));
    const limited = await limiter.limit(`fetch-user-answers-${ipHash}`, {
      bucket_time: 600,
      req_limit: 300,
    });
    if (limited) {
      return sendApiError(429, '요청 제한에 도달했습니다!');
    }

    const query_limit = data.limit ? Math.max(1, Math.min(data.limit, 100)) : 100;
    const sinceId = data.sinceId;
    const untilId = data.untilId;

    //내림차순이 기본값
    const orderBy = data.sort === 'ASC' ? 'asc' : 'desc';

    if (!data.answeredPersonHandle) {
      throw new Error(`answeredPersonHandle is null`);
    }
    const res = await prisma.answer.findMany({
      where: {
        answeredPersonHandle: data.answeredPersonHandle,
        id: {
          ...(typeof sinceId === 'string' ? { gt: sinceId } : {}),
          ...(typeof untilId === 'string' ? { lt: untilId } : {}),
        },
      },
      include: {
        answeredPerson: true,
      },
      orderBy: {
        id: orderBy,
      },
      take: query_limit,
    });

    const answerCount = await prisma.profile.findMany({
      where: {
        handle: data.answeredPersonHandle,
      },
      select: {
        _count: {
          select: {
            answer: true,
          },
        },
      },
    });

    return NextResponse.json({
      answers: res,
      count: answerCount[0]._count.answer,
    });
  } catch (err) {
    logger.log(err);
  }
}
