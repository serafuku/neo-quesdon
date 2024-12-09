import { NextRequest, NextResponse } from 'next/server';
import { Auth, JwtPayload } from '@/api/_utils/jwt/decorator';
import { RateLimit } from '@/_service/ratelimiter/decorator';
import type { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { PrismaClient } from '@prisma/client';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { validateStrict } from '@/utils/validator/strictValidator';
import {
  Block,
  CreateBlockDto,
  DeleteBlockDto,
  GetBlockListReqDto,
  SearchBlockListReqDto,
} from '@/app/_dto/blocking/blocking.dto';
import { sendApiError } from '@/api/_utils/apiErrorResponse/sendApiError';
import { RedisKvCacheService } from '@/app/api/_service/kvCache/redisKvCacheService';
import { Logger } from '@/utils/logger/Logger';
import { QueueService } from '@/app/api/_service/queue/queueService';

export class BlockingService {
  private static instance: BlockingService;
  private prisma: PrismaClient;
  private redisKvService: RedisKvCacheService;
  private logger = new Logger('BlockingService');
  private queueService: QueueService;

  private constructor() {
    this.prisma = GetPrismaClient.getClient();
    this.redisKvService = RedisKvCacheService.getInstance();
    this.queueService = QueueService.get();
  }
  public static get() {
    if (!BlockingService.instance) {
      BlockingService.instance = new BlockingService();
    }
    return BlockingService.instance;
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 60 }, 'user')
  public async createBlock(req: NextRequest, @JwtPayload tokenBody?: jwtPayloadType) {
    let data;
    try {
      data = await validateStrict(CreateBlockDto, await req.json());
    } catch {
      return sendApiError(400, 'Bad request');
    }

    const user = await this.prisma.user.findUnique({ where: { handle: tokenBody!.handle } });
    const targetUser = await this.prisma.user.findUnique({ where: { handle: data.targetHandle } });
    if (user === null || targetUser === null) {
      return sendApiError(400, 'Bad Request. User not found');
    }
    const targetHandle = targetUser.handle;

    const dbData = {
      blockeeHandle: targetHandle,
      blockerHandle: user.handle,
      hidden: false,
      imported: false,
    };
    try {
      await this.prisma.blocking.create({ data: dbData });
    } catch {
      return sendApiError(400, '이미 차단된 사용자입니다!');
    }

    await this.redisKvService.drop(`block-${user.handle}`);
    return NextResponse.json({}, { status: 200 });
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 150 }, 'user')
  public async getBlockList(req: NextRequest, @JwtPayload tokenBody?: jwtPayloadType) {
    let data;
    try {
      data = await validateStrict(GetBlockListReqDto, await req.json());
    } catch {
      return sendApiError(400, 'Bad Request');
    }
    const user = await this.prisma.user.findUnique({ where: { handle: tokenBody!.handle } });
    if (user === null) {
      return sendApiError(400, 'Bad request. user not found');
    }
    // 내림차순이 기본값
    const orderBy = data.sort === 'ASC' ? 'asc' : 'desc';
    const blockList = await this.prisma.blocking.findMany({
      where: {
        blockerHandle: user.handle,
        id: {
          ...(data.sinceId ? { gt: data.sinceId } : {}),
          ...(data.untilId ? { lt: data.untilId } : {}),
        },
        hidden: false,
      },
      orderBy: { id: orderBy },
      take: data.limit ?? 10,
    });

    const return_data = blockList.map((v) => {
      const d: Block = {
        id: v.id,
        targetHandle: v.blockeeHandle,
        blockedAt: v.createdAt,
      };
      return d;
    });

    return NextResponse.json(
      { blockList: return_data },
      {
        status: 200,
        headers: { 'Cache-Control': 'private, no-store, max-age=0' },
      },
    );
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 150 }, 'user')
  public async searchInBlockListByHandle(req: NextRequest, @JwtPayload tokenBody?: jwtPayloadType) {
    let data;
    try {
      data = await validateStrict(SearchBlockListReqDto, await req.json());
    } catch {
      return sendApiError(400, 'Bad Request');
    }
    if (!tokenBody) {
      return sendApiError(401, '');
    }
    const r = await this.prisma.blocking.findMany({
      where: {
        blockerHandle: tokenBody.handle,
        blockeeHandle: data.targetHandle,
        hidden: false,
      },
    });
    const isBlocked = r.length > 0;

    return NextResponse.json({ isBlocked: isBlocked ? true : false }, { status: 200 });
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 60 }, 'user')
  public async deleteBlock(req: NextRequest, @JwtPayload tokenBody?: jwtPayloadType) {
    let data;
    try {
      data = await validateStrict(DeleteBlockDto, await req.json());
    } catch {
      return sendApiError(400, 'Bad Request');
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { handle: tokenBody!.handle } });

    try {
      const r = await this.prisma.blocking.deleteMany({
        where: {
          blockeeHandle: data.targetHandle,
          blockerHandle: user.handle,
          hidden: false,
        },
      });
      this.logger.debug(`${r.count} block deleted`);
    } catch {
      return sendApiError(400, '이미 차단 해제된 사용자입니다!');
    }

    await this.redisKvService.drop(`block-${user.handle}`);
    return NextResponse.json({}, { status: 200 });
  }

  @Auth()
  @RateLimit({ bucket_time: 60, req_limit: 2 }, 'user')
  public async importBlockFromRemote(_req: NextRequest, @JwtPayload tokenBody?: jwtPayloadType) {
    const user = await this.prisma.user.findUnique({ where: { handle: tokenBody!.handle } });
    if (!user) {
      return sendApiError(400, '찾을 수 없는 유저입니다');
    }
    await this.queueService.addBlockImportJob(user);
    return NextResponse.json(
      { message: 'OK, queued.' },
      {
        status: 202,
        headers: { 'content-type': 'application/json' },
      },
    );
  }
}
