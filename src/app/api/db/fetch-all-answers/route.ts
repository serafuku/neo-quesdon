import { AnswerListWithProfileDto, AnswerWithProfileDto } from '@/app/_dto/Answers.dto';
import { FetchAllAnswersReqDto } from '@/app/_dto/fetch-all-answers/fetch-all-answers.dto';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { getIpFromRequest } from '@/app/api/_utils/getIp/get-ip-from-Request';
import { getIpHash } from '@/app/api/_utils/getIp/get-ip-hash';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { RateLimiterService } from '@/app/api/_utils/ratelimiter/rateLimiter';
import { validateStrict } from '@/utils/validator/strictValidator';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/api/_utils/jwt/verify-jwt';
import { userProfileDto } from '@/app/_dto/fetch-profile/Profile.dto';
import { profile } from '@prisma/client';

export async function POST(req: NextRequest) {
  const prisma = GetPrismaClient.getClient();

  const limiter = RateLimiterService.getLimiter();
  const ipHash = getIpHash(getIpFromRequest(req));
  const limited = await limiter.limit(`fetch-all-answers-${ipHash}`, {
    bucket_time: 600,
    req_limit: 600,
  });
  if (limited) {
    return sendApiError(429, '요청 제한에 도달했습니다!');
  }
  let tokenPayload;
  try {
    const token = req.cookies.get('jwtToken')?.value;
    tokenPayload = await verifyToken(token);
  } catch {
    // no login
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
  const orderBy = data.sort === 'ASC' ? 'asc' : 'desc';

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
      id: orderBy,
    },
    take: query_limit,
  });
  let list: AnswerWithProfileDto[] = answersWithProfile.map((answer) => {
    const data: AnswerWithProfileDto = {
      id: answer.id,
      question: answer.question,
      questioner: answer.questioner,
      answer: answer.answer,
      answeredAt: answer.answeredAt,
      answeredPersonHandle: answer.answeredPersonHandle,
      answeredPerson: profileToDto(answer.answeredPerson),
      nsfwedAnswer: answer.nsfwedAnswer,
    };
    return data;
  });

  if (tokenPayload?.handle) {
    // 로그인 상태면 블락 필터링
    list = await filterBlock(list, tokenPayload.handle);
  }

  const return_data: AnswerListWithProfileDto = {
    answersList: list,
  };

  return NextResponse.json(return_data, {
    headers: { 'Content-type': 'application/json', 'Cache-Control': 'private, no-store, max-age=0' },
  });
}

async function filterBlock(answers: AnswerWithProfileDto[], myHandle: string) {
  const prisma = GetPrismaClient.getClient();
  const blockList = await prisma.blocking.findMany({ where: { blockerHandle: myHandle, hidden: false } });
  const blockedList = await prisma.blocking.findMany({ where: { blockeeHandle: myHandle, hidden: false } });
  const filteredAnswers = answers.filter((ans) => {
    if (blockList.find((b) => b.blockeeHandle === ans.answeredPersonHandle || b.blockeeHandle === ans.questioner)) {
      return false;
    }
    if (blockedList.find((b) => b.blockerHandle === ans.answeredPersonHandle || b.blockerHandle === ans.questioner)) {
      return false;
    }
    return true;
  });

  return filteredAnswers;
}

function profileToDto(profile: profile): userProfileDto {
  const data: userProfileDto = {
    handle: profile.handle,
    name: profile.name,
    stopNewQuestion: profile.stopNewQuestion,
    stopAnonQuestion: profile.stopAnonQuestion,
    stopNotiNewQuestion: profile.stopNotiNewQuestion,
    avatarUrl: profile.avatarUrl,
    questionBoxName: profile.questionBoxName,
  }
  return data;
}