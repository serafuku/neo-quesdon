import { DeleteAnswerDto } from '@/app/_dto/delete-answer/delete-answer.dto';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { validateStrict } from '@/utils/validator/strictValidator';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../_utils/jwt/verify-jwt';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { RateLimiterService } from '@/app/api/_utils/ratelimiter/rateLimiter';

const logger = new Logger('delete-answer');
export async function POST(req: NextRequest) {
  let data: DeleteAnswerDto;
  try {
    data = await validateStrict(DeleteAnswerDto, await req.json());
  } catch (err) {
    return sendApiError(400, `Bad Request ${err}`);
  }
  const prisma = GetPrismaClient.getClient();
  const cookieStore = await cookies();
  const token = cookieStore.get('jwtToken')?.value;
  let tokenPayload;
  // JWT 토큰 검증
  try {
    tokenPayload = await verifyToken(token);
  } catch {
    return sendApiError(401, 'Unauthorized');
  }

  const limiter = RateLimiterService.getLimiter();
  const limited = await limiter.limit(`delete-answer-${tokenPayload.handle}`, {
    bucket_time: 600,
    req_limit: 300,
  });
  if (limited) {
    return sendApiError(429, '요청 제한에 도달했습니다!');
  }

  const willBeDeletedAnswer = await prisma.answer.findUnique({
    where: { id: data.id },
  });
  if (!willBeDeletedAnswer) {
    // 그런 답변이 없음
    return sendApiError(404, 'Not Found');
  }
  if (willBeDeletedAnswer.answeredPersonHandle !== tokenPayload.handle) {
    // 너의 답변이 아님
    return sendApiError(403, 'This is Not Your Answer!');
  }
  try {
    logger.log(`Delete answer... : ${data.id}`);
    await prisma.answer.delete({ where: { id: data.id } });

    return NextResponse.json({ message: 'Delete Answer Successful' }, { status: 200 });
  } catch (err) {
    logger.error('Error: Delete answer:', err);
    return sendApiError(500, `Error ${JSON.stringify(err)}`);
  }
}
