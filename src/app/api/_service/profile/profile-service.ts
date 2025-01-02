import { userProfileMeDto, userProfileDto } from '@/app/_dto/fetch-profile/Profile.dto';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Auth, JwtPayload } from '@/app/api/_utils/jwt/decorator';
import type { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { RateLimit } from '@/_service/ratelimiter/decorator';
import { Logger } from '@/utils/logger/Logger';
import { NextRequest, NextResponse } from 'next/server';

export class ProfileService {
  private logger = new Logger('ProfileService');
  private static instance: ProfileService;
  private constructor() {}
  public static get() {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  @Auth({ isOptional: true })
  @RateLimit({ bucket_time: 600, req_limit: 300 }, 'user-or-ip')
  public async fetchProfile(
    req: NextRequest,
    isMe: boolean,
    handlePath?: string,
    @JwtPayload tokenPayload?: jwtPayloadType,
  ) {
    const prisma = GetPrismaClient.getClient();
    const handle = isMe ? tokenPayload?.handle : handlePath;
    if (isMe && !tokenPayload?.handle) {
      return sendApiError(401, 'Unauthorized', 'UNAUTHORIZED');
    } else if (!handle) {
      return sendApiError(400, 'Bad request', 'BAD_REQUEST');
    }

    try {
      const userProfile = await prisma.profile.findUnique({
        include: {
          user: {
            include: { server: { select: { instanceType: true } } },
          },
          _count: {
            select: { answer: true, questions: true },
          },
        },
        where: {
          handle: handle,
        },
      });
      if (!userProfile) {
        return NextResponse.json({ message: `User not found` }, { status: 404 });
      }
      const instanceType = userProfile.user.server.instanceType;

      const questionCount = userProfile._count.questions;

      const resNotMe: userProfileDto = {
        handle: userProfile.handle,
        name: userProfile.name,
        stopNewQuestion: userProfile.stopNewQuestion,
        stopAnonQuestion: userProfile.stopAnonQuestion,
        avatarUrl: userProfile.avatarUrl,
        questionBoxName: userProfile.questionBoxName,
        stopNotiNewQuestion: userProfile.stopNotiNewQuestion,
        hostname: userProfile.user.hostName,
        instanceType: instanceType,
      };
      const resMe: userProfileMeDto = {
        handle: userProfile.handle,
        name: userProfile.name,
        stopNewQuestion: userProfile.stopNewQuestion,
        stopAnonQuestion: userProfile.stopAnonQuestion,
        avatarUrl: userProfile.avatarUrl,
        questionBoxName: userProfile.questionBoxName,
        stopNotiNewQuestion: userProfile.stopNotiNewQuestion,
        stopPostAnswer: userProfile.stopPostAnswer,
        questions: questionCount,
        instanceType: instanceType,
        defaultPostVisibility: userProfile.defaultPostVisibility,
        hostname: userProfile.user.hostName,
        wordMuteList: userProfile.wordMuteList,
      };
      if (isMe) {
        return NextResponse.json(resMe, {
          status: 200,
          headers: { 'Content-type': 'application/json', 'Cache-Control': 'private, no-store, max-age=0' },
        });
      } else {
        return NextResponse.json(resNotMe, {
          status: 200,
          headers: { 'Content-type': 'application/json', 'Cache-Control': 'public, max-age=10' },
        });
      }
    } catch (err) {
      this.logger.warn(err);
      return NextResponse.json({ message: `Bad Request: ${err}` }, { status: 400 });
    }
  }
}
