import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../_utils/jwt/verify-jwt';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { RateLimiterService } from '@/app/api/_utils/ratelimiter/rateLimiter';

export async function GET(req: NextRequest) {
  const prisma = GetPrismaClient.getClient();
  const cookie = req.cookies.get('jwtToken');

  try {
    if (cookie) {
      const jwt = await verifyToken(cookie.value);
      const limiter = RateLimiterService.getLimiter();
      const limited = await limiter.limit(`fetch-my-questions-${jwt.handle}`, {
        bucket_time: 600,
        req_limit: 300,
      });
      if (limited) {
        return sendApiError(429, '요청 제한에 도달했습니다!');
      }

      if (jwt.handle) {
        const questions = await prisma.question.findMany({
          where: {
            questioneeHandle: jwt.handle,
          },
          orderBy: {
            id: 'desc',
          },
        });
        return NextResponse.json(questions);
      } else {
        return sendApiError(400, 'Bad Request');
      }
    } else {
      return sendApiError(401, 'Unauthorized');
    }
  } catch (err) {
    return sendApiError(500, `${err}`);
  }
}
