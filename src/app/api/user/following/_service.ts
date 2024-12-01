import { Logger } from '@/utils/logger/Logger';
import { Auth, JwtPayload } from '../../_utils/jwt/decorator';
import { RateLimit } from '../../_utils/ratelimiter/decorator';
import { NextRequest, NextResponse } from 'next/server';
import type { jwtPayload } from '../../_utils/jwt/jwtPayload';
import { validateStrict } from '@/utils/validator/strictValidator';
import { FollowingListReqDto, FollowingListResDto } from '@/app/_dto/following/following.dto';
import { sendApiError } from '../../_utils/apiErrorResponse/sendApiError';
import { GetPrismaClient } from '../../_utils/getPrismaClient/get-prisma-client';

export class FollowingService {
  private static instance: FollowingService;
  private logger = new Logger('FollowingService');
  private constructor() { }
  public static get() {
    if (!FollowingService.instance) {
      FollowingService.instance = new FollowingService();
    }
    return FollowingService.instance;
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 300 }, 'user')
  public async getFollowing(req: NextRequest, @JwtPayload tokenBody?: jwtPayload) {
    const prisma = GetPrismaClient.getClient();
    let data;
    try {
      data = await validateStrict(FollowingListReqDto, await req.json());
    } catch {
      return sendApiError(400, 'Bad Request');
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { handle: tokenBody!.handle } });

    const follows = await prisma.following.findMany({ where: { followerHandle: user.handle } });
    const filteredDto: FollowingListResDto = { followingList: [] };
    for (const f of follows) {
      const exist = await prisma.profile.findUnique({ where: { handle: f.followeeHandle } });
      if (exist) {
        filteredDto.followingList.push({
          followerHandle: f.followerHandle, follweeHandle: f.followeeHandle,
          follweeProfile: {
            handle: exist.handle,
            name: exist.name,
            stopNewQuestion: exist.stopNewQuestion,
            stopAnonQuestion: exist.stopAnonQuestion,
            stopNotiNewQuestion: exist.stopNotiNewQuestion,
            avatarUrl: exist.avatarUrl,
            questionBoxName: exist.questionBoxName,
          }
        });
      }
    }
    return NextResponse.json(filteredDto, { status: 200 });
  }
}
