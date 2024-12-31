import { NextRequest, NextResponse } from 'next/server';
import { Auth, JwtPayload } from '@/api/_utils/jwt/decorator';
import { RateLimit } from '@/_service/ratelimiter/decorator';
import type { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { PrismaClient } from '@prisma/client';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { validateStrict } from '@/utils/validator/strictValidator';
import {
  Block,
  createBlockByQuestionDto,
  CreateBlockDto,
  DeleteBlockByIdDto,
  DeleteBlockDto,
  GetBlockListReqDto,
  SearchBlockListReqDto,
} from '@/app/_dto/blocking/blocking.dto';
import { sendApiError } from '@/api/_utils/apiErrorResponse/sendApiError';
import { RedisKvCacheService } from '@/app/api/_service/kvCache/redisKvCacheService';
import { Logger } from '@/utils/logger/Logger';
import { QueueService } from '@/app/api/_service/queue/queueService';
import { RedisPubSubService } from '@/_service/redis-pubsub/redis-event.service';
import { QuestionDeletedPayload } from '@/app/_dto/websocket-event/websocket-event.dto';
import { Body, ValidateBody } from '@/app/api/_utils/Validator/decorator';

export class BlockingService {
  private static instance: BlockingService;
  private prisma: PrismaClient;
  private redisKvService: RedisKvCacheService;
  private redisPubsubService: RedisPubSubService;
  private logger = new Logger('BlockingService');
  private queueService: QueueService;

  private constructor() {
    this.prisma = GetPrismaClient.getClient();
    this.redisKvService = RedisKvCacheService.getInstance();
    this.queueService = QueueService.get();
    this.redisPubsubService = RedisPubSubService.getInstance();
  }
  public static get() {
    if (!BlockingService.instance) {
      BlockingService.instance = new BlockingService();
    }
    return BlockingService.instance;
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 60 }, 'user')
  @ValidateBody(CreateBlockDto)
  public async createBlockApi(_req: NextRequest, @Body data: CreateBlockDto, @JwtPayload tokenBody: jwtPayloadType) {
    const user = await this.prisma.user.findUnique({ where: { handle: tokenBody.handle } });
    const targetUser = await this.prisma.user.findUnique({ where: { handle: data.targetHandle } });
    if (user === null || targetUser === null) {
      return sendApiError(400, 'Bad Request. User not found', 'USER_NOT_EXIST');
    }
    try {
      if (data.targetHandle === tokenBody?.handle) {
        return sendApiError(400, 'Can not block Yourself!', 'CAN_NOT_BLOCK_YOURSELF');
      }
      const b = await this.createBlock(targetUser.handle, user.handle, false);
      this.logger.debug(`New Block created, hidden: ${b.hidden}, target: ${b.blockeeTarget}`);
    } catch (err) {
      return sendApiError(500, String(err), 'SERVER_ERROR');
    }

    return NextResponse.json({}, { status: 200 });
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 60 }, 'user')
  @ValidateBody(createBlockByQuestionDto)
  public async createBlockByQuestionApi(
    _req: NextRequest,
    @JwtPayload tokenBody: jwtPayloadType,
    @Body data: createBlockByQuestionDto,
  ): Promise<NextResponse> {
    try {
      const q = await this.prisma.question.findUnique({ where: { id: data.questionId } });
      if (!q) {
        return sendApiError(400, 'questionId not found!', 'NOT_FOUND');
      }
      if (q.questioneeHandle !== tokenBody?.handle) {
        return sendApiError(403, 'Not your question!', 'NOT_YOUR_QUESTION');
      }
      if (q.questioner) {
        if (q.questioner === tokenBody.handle) {
          return sendApiError(400, 'Can not Block yourself', 'CAN_NOT_BLOCK_YOURSELF');
        }
        const b = await this.createBlock(q.questioner, tokenBody.handle, false, q.isAnonymous);
        this.logger.debug(`New Block created by Question ${q.id}, hidden: ${b.hidden}, target: ${b.blockeeTarget}`);
        return NextResponse.json(`OK. block created!`, { status: 201 });
      } else {
        return NextResponse.json(`Block not created! (questioner is null)`, { status: 200 });
      }
    } catch (err) {
      return sendApiError(500, 'ERROR!' + String(err), 'SERVER_ERROR');
    }
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 150 }, 'user')
  @ValidateBody(GetBlockListReqDto)
  public async getBlockList(_req: NextRequest, @JwtPayload tokenBody: jwtPayloadType, @Body data: GetBlockListReqDto) {
    const user = await this.prisma.user.findUnique({ where: { handle: tokenBody!.handle } });
    if (user === null) {
      return sendApiError(400, 'Bad request. user not found', 'USER_NOT_EXIST');
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
      },
      orderBy: { id: orderBy },
      take: data.limit ?? 10,
    });

    const return_data = blockList.map((v) => {
      const d: Block = {
        id: v.id,
        targetHandle: v.hidden ? `익명의 질문자 ${v.id}` : v.blockeeTarget,
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
  @ValidateBody(SearchBlockListReqDto)
  public async searchInBlockListByHandle(
    req: NextRequest,
    @JwtPayload tokenBody: jwtPayloadType,
    @Body data: SearchBlockListReqDto,
  ) {
    const r = await this.prisma.blocking.findMany({
      where: {
        blockerHandle: tokenBody.handle,
        blockeeTarget: data.targetHandle,
        hidden: false,
      },
    });
    const isBlocked = r.length > 0;

    return NextResponse.json({ isBlocked: isBlocked ? true : false }, { status: 200 });
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 60 }, 'user')
  public async deleteBlock(req: NextRequest, @JwtPayload tokenBody: jwtPayloadType) {
    let data;
    try {
      const reqJson = await req.json();
      if (reqJson.targetId) {
        data = await validateStrict(DeleteBlockByIdDto, reqJson);
      } else {
        data = await validateStrict(DeleteBlockDto, reqJson);
      }
    } catch (err) {
      return sendApiError(400, `Bad Request ${String(err)}`, 'BAD_REQUEST');
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { handle: tokenBody.handle } });

    try {
      const deleteById = (data as DeleteBlockByIdDto).targetId ? (data as DeleteBlockByIdDto) : null;
      const deleteByHandle = (data as DeleteBlockDto).targetHandle ? (data as DeleteBlockDto) : null;
      if (deleteById) {
        const r = await this.prisma.blocking.deleteMany({
          where: {
            id: deleteById.targetId,
            blockerHandle: user.handle,
          },
        });
        this.logger.debug(`${r.count} block deleted (by id ${deleteById.targetId})`);
        return NextResponse.json({ message: `${r.count} block deleted (by id ${deleteById.targetId})` });
      }
      if (deleteByHandle) {
        const r = await this.prisma.blocking.deleteMany({
          where: {
            blockeeTarget: deleteByHandle.targetHandle,
            blockerHandle: user.handle,
            hidden: false,
          },
        });
        this.logger.debug(`${r.count} block deleted`);
        return NextResponse.json({ message: `${r.count} block deleted` });
      }
    } catch {
      return sendApiError(500, 'Unblock Error!', 'SERVER_ERROR');
    }

    await this.redisKvService.drop(`block-${user.handle}`);
    return NextResponse.json({}, { status: 200 });
  }

  @Auth()
  @RateLimit({ bucket_time: 60, req_limit: 2 }, 'user')
  public async importBlockFromRemote(_req: NextRequest, @JwtPayload tokenBody: jwtPayloadType) {
    const user = await this.prisma.user.findUnique({ where: { handle: tokenBody.handle } });
    if (!user) {
      return sendApiError(400, 'User not exist', 'USER_NOT_EXIST');
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

  /**
   * 블락을 생성하고, 미답변 질문중 블락대상의 것은 삭제
   * @param blockeeTarget 블락될 대상의 핸들이나 ipHash
   * @param myHandle  내 핸들
   * @param imported ImportBlock에 의해서 가져온 Block인 경우 true
   * @param isHidden 익명질문의 유저를 차단하는 경우 true
   */
  public async createBlock(blockeeTarget: string, myHandle: string, imported?: boolean, isHidden?: boolean) {
    const dbData = {
      blockeeTarget: blockeeTarget,
      blockerHandle: myHandle,
      hidden: isHidden ? true : false,
      imported: imported ? true : false,
      createdAt: new Date(Date.now()),
    };
    const b = await this.prisma.blocking.upsert({
      where: {
        blockeeTarget_blockerHandle_hidden_imported: {
          blockeeTarget: dbData.blockeeTarget,
          blockerHandle: dbData.blockerHandle,
          hidden: dbData.hidden,
          imported: dbData.imported,
        },
      },
      create: dbData,
      update: dbData,
    });

    //기존 질문의 필터링
    const question_list = await this.prisma.question.findMany({ where: { questioneeHandle: myHandle } });
    const remove_list = question_list.filter((q) => q.questioner === blockeeTarget);
    remove_list.forEach(async (r) => {
      await this.prisma.question.delete({ where: { id: r.id } });
      const ev_data: QuestionDeletedPayload = {
        deleted_id: r.id,
        question_numbers: question_list.length - remove_list.length,
        handle: myHandle,
      };
      await this.redisPubsubService.pub<QuestionDeletedPayload>('question-deleted-event', ev_data);
    });
    await this.redisKvService.drop(`block-${myHandle}`);

    return b;
  }
}
