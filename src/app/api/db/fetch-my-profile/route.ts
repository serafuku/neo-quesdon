import { userProfileMeDto } from '@/app/_dto/fetch-profile/Profile.dto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../_utils/jwt/verify-jwt';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { RateLimiterService } from '@/app/api/_utils/ratelimiter/rateLimiter';

export async function GET(req: NextRequest) {
  const prisma = GetPrismaClient.getClient();
  const token = req.cookies.get('jwtToken')?.value;

  try {
    if (!token) {
      return sendApiError(401, 'No Auth Token');
    }
    let handle: string;
    try {
      handle = (await verifyToken(token)).handle;
    } catch {
      return sendApiError(401, 'Token Verify Error');
    }
    const limiter = RateLimiterService.getLimiter();
    const limited = await limiter.limit(`fetch-my-profile-${handle}`, {
      bucket_time: 600,
      req_limit: 300,
    });
    if (limited) {
      return sendApiError(429, '요청 제한에 도달했습니다!');
    }

    const userProfile = await prisma.profile.findUnique({
      include: {
        user: {
          select: { hostName: true },
        },
      },
      where: {
        handle: handle,
      },
    });
    if (!userProfile) {
      return NextResponse.json({ message: `User not found` }, { status: 404 });
    }
    const host = userProfile.user.hostName;
    const { instanceType } = await prisma.server.findUniqueOrThrow({
      where: { instances: host },
      select: { instanceType: true },
    });

    const questionCount = await prisma.profile.findUnique({
      where: {
        handle: handle,
      },
      select: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });
    const res: userProfileMeDto = {
      handle: userProfile.handle,
      name: userProfile.name,
      stopNewQuestion: userProfile.stopNewQuestion,
      stopAnonQuestion: userProfile.stopAnonQuestion,
      avatarUrl: userProfile.avatarUrl,
      questionBoxName: userProfile.questionBoxName,
      stopNotiNewQuestion: userProfile.stopNotiNewQuestion,
      stopPostAnswer: userProfile.stopPostAnswer,
      questions: questionCount ? questionCount._count.questions : null,
      instanceType: instanceType,
    };

    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ message: `Bad Request: ${err}` }, { status: 400 });
  }
}
