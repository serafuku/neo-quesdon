import { Logger } from '@/utils/logger/Logger';
import { Auth, JwtPayload } from '@/api/_utils/jwt/decorator';
import { RateLimit } from '@/_service/ratelimiter/decorator';
import { NextRequest, NextResponse } from 'next/server';
import type { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { validateStrict } from '@/utils/validator/strictValidator';
import { FollowingListReqDto, FollowingListResDto } from '@/app/_dto/following/following.dto';
import { sendApiError } from '@/api/_utils/apiErrorResponse/sendApiError';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { RedisKvCacheService } from '@/app/api/_service/kvCache/redisKvCacheService';

export class FollowingService {
  private static instance: FollowingService;
  private logger = new Logger('FollowingService');
  private constructor() {}
  public static get() {
    if (!FollowingService.instance) {
      FollowingService.instance = new FollowingService();
    }
    return FollowingService.instance;
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 300 }, 'user')
  public async getFollowing(req: NextRequest, @JwtPayload tokenBody?: jwtPayloadType) {
    const prisma = GetPrismaClient.getClient();
    let data;
    try {
      data = await validateStrict(FollowingListReqDto, await req.json());
    } catch {
      return sendApiError(400, 'Bad Request');
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { handle: tokenBody!.handle } });

    const fn = async () => {
      const follows = await prisma.following.findMany({
        where: { followerHandle: user.handle },
      });

      const filteredList = [];
      for (const f of follows) {
        const exist = await prisma.profile.findUnique({
          where: { handle: f.followeeHandle },
          include: {
            _count: { select: { answer: true } },
            user: { include: { server: { select: { instances: true, instanceType: true } } } },
          },
        });
        if (exist) {
          filteredList.push(exist);
        }
      }
      // 답변순 정렬
      filteredList.sort((a, b) => {
        if (a._count.answer > b._count.answer) {
          return -1;
        }
        if (b._count.answer > a._count.answer) {
          return 1;
        }
        return 0;
      });

      const filteredDto: FollowingListResDto = { followingList: [] };
      filteredList.forEach((exist) => {
        filteredDto.followingList.push({
          followerHandle: user.handle,
          follweeHandle: exist.handle,
          follweeProfile: {
            handle: exist.handle,
            name: exist.name,
            stopNewQuestion: exist.stopNewQuestion,
            stopAnonQuestion: exist.stopAnonQuestion,
            stopNotiNewQuestion: exist.stopNotiNewQuestion,
            avatarUrl: exist.avatarUrl,
            questionBoxName: exist.questionBoxName,
            hostname: exist.user.hostName,
            instanceType: exist.user.server.instanceType,
          },
        });
      });
      return filteredDto;
    };

    const kv = RedisKvCacheService.getInstance();
    const filteredDto = await kv.get(fn, {key: `follow-${user.handle}`, ttl: 600});
    if (data.limit) {
      filteredDto.followingList = filteredDto.followingList.slice(0, data.limit);
    }
    return NextResponse.json(filteredDto, { status: 200 });
  }
}
