import { CreateQuestionDto } from '@/app/_dto/questions/create-question.dto';
import type { PrismaClient, question, user } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { Auth, JwtPayload } from '@/api/_utils/jwt/decorator';
import type { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { RateLimit } from '@/_service/ratelimiter/decorator';
import re2 from 're2';
import { RedisPubSubService } from '@/app/api/_service/redis-pubsub/redis-event.service';
import { QuestionCreatedPayload, QuestionDeletedPayload } from '@/app/_dto/websocket-event/websocket-event.dto';
import { isInt } from 'class-validator';
import { getIpHash } from '@/app/api/_utils/getIp/get-ip-hash';
import { getIpFromRequest } from '@/app/api/_utils/getIp/get-ip-from-Request';
import { questionDto } from '@/app/_dto/questions/question.dto';
import { Body, ValidateBody } from '@/app/api/_utils/Validator/decorator';
import { MiUser } from '@/app/api/_misskey-entities/user';
import { MastodonRelationship } from '@/app/api/_mastodon-entities/relationship';
import { RedisKvCacheService } from '@/app/api/_service/kvCache/redisKvCacheService';

export class QuestionService {
  private logger = new Logger('QuestionService');
  private static instance: QuestionService;
  private eventService: RedisPubSubService;
  private prisma: PrismaClient;
  private constructor() {
    this.eventService = RedisPubSubService.getInstance();
    this.prisma = GetPrismaClient.getClient();
  }
  public static getInstance() {
    if (!QuestionService.instance) {
      QuestionService.instance = new QuestionService();
    }
    return QuestionService.instance;
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 150 }, 'user')
  public async GetMyQuestionsApi(_req: NextRequest, @JwtPayload tokenPayload: jwtPayloadType) {
    try {
      const prisma = GetPrismaClient.getClient();
      const kv = RedisKvCacheService.getInstance();

      const getBlockList = async () => {
        return prisma.blocking.findMany({
          where: { blockerHandle: tokenPayload.handle, hidden: false },
        });
      };
      const getBlockedList = async () => {
        return prisma.blocking.findMany({
          where: { blockeeTarget: tokenPayload.handle, hidden: false },
        })
      }
      const blockList = await kv.get(getBlockList, { key: `block-${tokenPayload.handle}`, ttl: 600 });
      const blockedList = await kv.get(getBlockedList, { key: `blocked-${tokenPayload.handle}`, ttl: 600 });
      const questions = await this.prisma.question.findMany({
        where: { questioneeHandle: tokenPayload.handle },
        orderBy: { questionedAt: 'desc' },
      });
      const filteredQuestions = questions.filter((q) => {
        if (!q.questioner) return true;
        if (blockList.find((b) => b.blockeeTarget === q.questioner)) return false;
        if (blockedList.find((b) => b.blockerHandle === q.questioner)) return false;
        return true;
      });
      const questionDtos = filteredQuestions.map((q) => questionEntityToDto(q));
      return NextResponse.json(questionDtos, {
        status: 200,
        headers: { 'Cache-Control': 'private, no-store, max-age=0' },
      });
    } catch {
      sendApiError(500, 'Fail to Get my Questions', 'SERVER_ERROR');
    }
  }

  @RateLimit({ bucket_time: 100, req_limit: 10 }, 'user-or-ip')
  @Auth({ isOptional: true })
  @ValidateBody(CreateQuestionDto)
  public async CreateQuestionApi(
    req: NextRequest,
    @JwtPayload tokenPayload: jwtPayloadType,
    @Body data: CreateQuestionDto,
  ) {
    try {
      const questionee_user = await this.prisma.user.findUniqueOrThrow({
        where: {
          handle: data.questionee,
        },
      });
      const questionee_profile = await this.prisma.profile.findUniqueOrThrow({
        where: {
          handle: questionee_user.handle,
        },
      });


      if (questionee_profile.stopNewQuestion) {
        this.logger.debug('User stops NewQuestion');
        return sendApiError(403, 'User stops NewQuestion', 'USER_NOT_ACCEPT_NEW_QUESTION');
      }
      if (questionee_profile.stopAnonQuestion && data.isAnonymous) {
        this.logger.debug('The user has prohibits anonymous questions.');
        return sendApiError(403, 'The user has prohibits anonymous questions.', 'USER_NOT_ACCEPT_ANONYMOUS_QUESTION');
      }
      if (questionee_profile.mutualOnly && !tokenPayload?.handle) {
        this.logger.debug('The questionee is using a mutual-only filter, but the questioner is not logged in.')
        return sendApiError(403, 'The questionee is using a mutual-only filter, but you are not logged in.', 'USER_USING_MUTUAL_ONLY_WITHOUT_LOGIN')
      }


      // 블락 여부 검사
      const blockeeTarget = tokenPayload?.handle ?? getIpHash(getIpFromRequest(req));
      const blocked = await this.prisma.blocking.findFirst({
        where: { blockeeTarget: blockeeTarget, blockerHandle: questionee_user.handle },
      });
      if (blocked) {
        return sendApiError(403, 'You Can not Question to this user!', 'QUESTION_BLOCKED');
      }

      if (!data.isAnonymous && !tokenPayload?.handle) {
        this.logger.warn(`You must log in to send non-anonymous questions.`);
        return sendApiError(
          403,
          `You must log in to send non-anonymous questions.`,
          'YOU_MUST_LOGIN_TO_NON_ANONYMOUS_QUESTION',
        );
      }

      const wordMuteList = questionee_profile.wordMuteList;

      // Random delay to prevent word mutes from being discovered by timing attacks.
      await new Promise<void>((resolve) => {
        const random_delay = Math.random() * 50;
        setTimeout(() => {
          resolve();
        }, random_delay);
      });
      for (const word of wordMuteList) {
        const re = new re2(word);
        const matched = data.question.match(re);
        if (matched) {
          // 조용히 질문을 삭제
          this.logger.log(
            `Drop question! Pattern: ${word} Match: ${matched.toString()}, question ${data.question.replace(/(?:\r\n|\r|\n)/g, '\\n')}`,
          );
          return NextResponse.json({}, { status: 200 });
        }
      }

      if (questionee_profile.mutualOnly && tokenPayload?.handle !== questionee_user.handle) {
        const questionee_server = await this.prisma.server.findUniqueOrThrow({
          where: {
            instances: questionee_user.hostName
          }
        })

        switch (questionee_server.instanceType) {
          case 'misskey':
          case 'cherrypick':
          case 'iceshrimp':
          case 'sharkey': {
            const kv = RedisKvCacheService.getInstance();
            const cacheKey = `mutual:${questionee_user.handle}:${tokenPayload.handle}`;
            let mutual_following: boolean;
            try {
              mutual_following = await kv.get(
                async () => {
                  const res = await fetch(
                    `https://${questionee_server.instances}/api/users/show`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${questionee_user.token}` },
                      body: JSON.stringify({
                        'username': tokenPayload.handle.split('@')[1],
                        'host': tokenPayload.server,
                      }),
                    },
                  );
                  if (!res.ok) {
                    throw new Error(`Mutual follow check failed: ${questionee_server.instances} returned ${res.status}`);
                  }
                  const questioner_data_from_questionee = (await res.json()) as MiUser;
                  return !! (
                    questioner_data_from_questionee.isFollowed && questioner_data_from_questionee.isFollowing
                  );
                },
                { key: cacheKey, ttl: 60 },
              );
            } catch (err) {
              this.logger.error('Mutual follow check failed', err);
              return sendApiError(
                403,
                "Mutual follow check failed: questionee's server returned error.",
                'MUTUAL_FOLLOW_CHECK_FAILED',
              );
            }
            if (!mutual_following) {
              return sendApiError(403, 'You are not following each other.', 'NOT_MUTUAL_FOLLOWING');
            }
            break;
          }

          case 'Iceshrimp_NET':
          case 'mastodon': {
            const kv = RedisKvCacheService.getInstance();

            let questioner_key: string;
            const cached_key = await this.prisma.foreignServerUserKey.findUnique({
              where: {
                userHandle_serverDomain: {
                  userHandle: tokenPayload.handle,
                  serverDomain: questionee_server.instances,
                },
              },
            });
            if (cached_key) {
              questioner_key = cached_key.userKey;
            } else {
              const lookup_res = await fetch(
                `https://${questionee_server.instances}/api/v1/accounts/lookup?acct=${tokenPayload.handle.slice(1)}`,
                {
                  headers: { Authorization: `Bearer ${questionee_user.token}` },
                },
              );
              if (!lookup_res.ok) {
                return sendApiError(
                  403,
                  "Mutual follow check failed: questionee's server returned error.",
                  'MUTUAL_FOLLOW_CHECK_FAILED',
                );
              }
              const lookup_data = (await lookup_res.json()) as { id: string };
              const saved = await this.prisma.foreignServerUserKey.upsert({
                where: {
                  userHandle_serverDomain: {
                    userHandle: tokenPayload.handle,
                    serverDomain: questionee_server.instances,
                  },
                },
                update: {},
                create: {
                  userHandle: tokenPayload.handle,
                  serverDomain: questionee_server.instances,
                  userKey: lookup_data.id,
                },
              });
              questioner_key = saved.userKey;
            }

            const cacheKey = `mutual:${questionee_user.handle}:${tokenPayload.handle}`;
            let mutual_following: boolean;
            try {
              mutual_following = await kv.get(
                async () => {
                  const rel_res = await fetch(
                    `https://${questionee_server.instances}/api/v1/accounts/relationships?id[]=${questioner_key}`,
                    {
                      headers: { Authorization: `Bearer ${questionee_user.token}` },
                    },
                  );
                  if (!rel_res.ok) {
                    throw new Error(
                      `Mutual follow check failed: ${questionee_server.instances} returned ${rel_res.status}`,
                    );
                  }
                  const rel_data = (await rel_res.json()) as MastodonRelationship[];
                  return !!(rel_data[0]?.following && rel_data[0]?.followed_by);
                },
                { key: cacheKey, ttl: 60 },
              );
            } catch (err) {
              this.logger.error('Mutual follow check failed', err);
              return sendApiError(
                403,
                "Mutual follow check failed: questionee's server returned error.",
                'MUTUAL_FOLLOW_CHECK_FAILED',
              );
            }
            if (!mutual_following) {
              return sendApiError(403, 'You are not following each other.', 'NOT_MUTUAL_FOLLOWING');
            }
            break;
          }

          default: {
            this.logger.warn(`Unknown instanceType for mutual check: ${questionee_server.instanceType}`);
            return sendApiError(403, '...', 'MUTUAL_FOLLOW_CHECK_FAILED');
          }
        }
      }

      //질문 생성
      const newQuestion = await this.prisma.question.create({
        data: {
          question: data.question,
          questioner: tokenPayload?.handle ?? getIpHash(getIpFromRequest(req)),
          questioneeHandle: data.questionee,
          isAnonymous: data.isAnonymous,
        },
      });

      // 웹소켓으로 업데이트 전송
      const question_numbers = await this.prisma.question.count({
        where: {
          questioneeHandle: questionee_user.handle,
        },
      });
      const ev_data: QuestionCreatedPayload = {
        ...questionEntityToDto(newQuestion),
        question_numbers: question_numbers,
      };
      this.eventService.pub<QuestionCreatedPayload>('question-created-event', ev_data);

      const userSettings = await this.prisma.profile.findUnique({
        where: {
          handle: data.questionee,
        },
      });

      if (userSettings && userSettings.stopNotiNewQuestion === true) {
        // 알림 전송 스킵
      } else {
        // 알림 전송
        const url = `${process.env.WEB_URL}/main/questions`;
        this.sendNotify(newQuestion, questionee_user, url);
      }

      // notify send 기다라지 않고 200반환
      return NextResponse.json({}, { status: 200 });
    } catch (err) {
      return NextResponse.json(`Error! ${err}`, { status: 500 });
    }
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 150 }, 'user')
  public async deleteQuestionApi(_req: NextRequest, id: number, @JwtPayload tokenPayload: jwtPayloadType) {
    try {
      if (!isInt(id)) {
        return sendApiError(400, 'Bad QuestionId', 'BAD_REQUEST');
      }
      const q = await this.prisma.question.findUnique({ where: { id: id } });
      if (!q) {
        return sendApiError(400, 'No such question!', 'NOT_FOUND');
      }
      if (q.questioneeHandle !== tokenPayload.handle) {
        return sendApiError(403, 'You can not delete this question!', 'NOT_YOUR_QUESTION');
      }

      await this.prisma.question.delete({
        where: {
          id: id,
        },
      });

      const question_numbers = await this.prisma.question.count({ where: { questioneeHandle: tokenPayload.handle } });
      this.eventService.pub<QuestionDeletedPayload>('question-deleted-event', {
        deleted_id: id,
        handle: tokenPayload.handle,
        question_numbers: question_numbers,
      });
      return new NextResponse(null, { status: 200, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
    } catch (err) {
      this.logger.error('Fail to Delete question', err);
      return sendApiError(500, 'Fail to Delete question!', 'SERVER_ERROR');
    }
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 10 }, 'user')
  public async deleteAllQuestionsApi(_req: NextRequest, @JwtPayload tokenPayload: jwtPayloadType) {
    const userHandle = tokenPayload.handle;
    try {
      const questions = await this.prisma.question.findMany({ where: { questioneeHandle: userHandle } });
      const deleted = await this.prisma.question.deleteMany({ where: { questioneeHandle: userHandle } });
      this.logger.log(`Deleted ${deleted.count} Questions`);
      questions.forEach((q) => {
        this.eventService.pub<QuestionDeletedPayload>('question-deleted-event', {
          deleted_id: q.id,
          question_numbers: questions.length - deleted.count,
          handle: userHandle,
        });
      });
      return NextResponse.json(
        { message: `${deleted.count} Questions deleted!` },
        { status: 200, headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
      );
    } catch (err) {
      this.logger.error('Fail to delete questions', err);
      return sendApiError(500, 'Fail to delete questions', 'SERVER_ERROR');
    }
  }

  private async sendNotify(q: question, questionee_user: user, url: string): Promise<void> {
    const notify_host = process.env.NOTI_HOST;
    this.logger.log(`try to send notification to ${q.questioneeHandle}`);
    try {
      const res = await fetch(`https://${notify_host}/api/notes/create`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.NOTI_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visibleUserIds: [questionee_user.userId],
          visibility: 'specified',
          text: `${questionee_user.handle} <네오-퀘스돈> 새로운 질문이에요!\n질문자: ${q.isAnonymous ? '익명의 질문자' : `\`${q.questioner}\``}\nQ. ${q.question}\n ${url}`,
        }),
      });
      if (!res.ok) {
        throw new Error(`Note create error ${await res.text()}`);
      } else {
        this.logger.log(`Notification Sent to ${q.questioneeHandle}`);
      }
    } catch (error) {
      this.logger.error('Post-question: fail to send notify: ', error);
    }
  }
}

function questionEntityToDto(q: question): questionDto {
  return {
    id: q.id,
    question: q.question,
    questionedAt: q.questionedAt,
    questioneeHandle: q.questioneeHandle,
    questioner: q.isAnonymous ? null : q.questioner,
  };
}
