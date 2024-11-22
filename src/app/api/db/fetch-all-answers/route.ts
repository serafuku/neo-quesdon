import { AnswerDto } from "@/app/_dto/Answers.dto";
import { FetchAllAnswersReqDto } from "@/app/_dto/fetch-all-answers/fetch-all-answers.dto";
import { sendApiError } from "@/utils/apiErrorResponse/sendApiError";
import { getIpFromRequest } from "@/utils/getIp/get-ip-from-Request";
import { getIpHash } from "@/utils/getIp/get-ip-hash";
import { GetPrismaClient } from "@/utils/getPrismaClient/get-prisma-client";
import { RateLimiterService } from "@/utils/ratelimiter/rateLimiter";
import { validateStrict } from "@/utils/validator/strictValidator";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const prisma = GetPrismaClient.getClient();
  const ip = getIpFromRequest(req);
  const limiter = RateLimiterService.getLimiter();
  const ipHash = getIpHash(ip);
  const limited = await limiter.limit(`fetch-all-answers-${ipHash}`, {
    bucket_time: 600,
    req_limit: 600,
  });
  if (limited) {
    return sendApiError(429, '요청 제한에 도달했습니다!');
  }

  let data;
  try {
    data = await validateStrict(FetchAllAnswersReqDto, await req.json());
  } catch (err) {
    return sendApiError(400, `${err}`);
  }

  const query_limit = data.limit ? Math.max(1, Math.min(data.limit, 100)) : 100;
  const sinceId = data.sinceId;
  const untilId = data.untilId;

  //내림차순이 기본값
  const orderBy = (data.sort === 'ASC') ? 'asc' : 'desc';

  const answersWithProfile = await prisma.answer.findMany({
    where: {
      id: {
        ...(typeof sinceId === 'string' ? { gt: sinceId } : {}),
        ...(typeof untilId === 'string' ? { lt: untilId } : {}),
      },
    },
    include: {
      answeredPerson: true,
    },
    orderBy: {
      id: orderBy
    }, 
    take: query_limit
  });
  

  return NextResponse.json(answersWithProfile as unknown as AnswerDto);
}
