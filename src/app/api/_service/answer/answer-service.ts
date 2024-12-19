import { sendApiError } from '@/api/_utils/apiErrorResponse/sendApiError';
import { validateStrict } from '@/utils/validator/strictValidator';
import { NextRequest, NextResponse } from 'next/server';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import type { jwtPayloadType } from '@/api/_utils/jwt/jwtPayloadType';
import { Auth, JwtPayload } from '@/api/_utils/jwt/decorator';
import { RateLimit } from '@/_service/ratelimiter/decorator';
import { blocking, PrismaClient, answer } from '@prisma/client';
import { AnswerDto, AnswerListWithProfileDto, AnswerWithProfileDto } from '@/app/_dto/answers/Answers.dto';
import { FetchAllAnswersReqDto } from '@/app/_dto/answers/fetch-all-answers.dto';
import { FetchUserAnswersDto } from '@/app/_dto/answers/fetch-user-answers.dto';
import { RedisKvCacheService } from '@/app/api/_service/kvCache/redisKvCacheService';
import { RedisPubSubService } from '@/_service/redis-pubsub/redis-event.service';
import { AnswerDeletedEvPayload, QuestionDeletedPayload } from '@/app/_dto/websocket-event/websocket-event.dto';
import { CreateAnswerDto } from '@/app/_dto/answers/create-answer.dto';
import { profileToDto } from '@/api/_utils/profileToDto';
import { isString } from 'class-validator';
import RE2 from 're2';
import { NotificationService } from '@/app/api/_service/notification/notification.service';
import { mkMisskeyNote } from '@/app/api/_utils/uploadNote/misskeyNote';
import { mastodonToot } from '@/app/api/_utils/uploadNote/mastodonToot';
import { clampText } from '@/app/api/_utils/uploadNote/clampText';

export class AnswerService {
  private static instance: AnswerService;
  private logger = new Logger('AnswerService');
  private event_service: RedisPubSubService;
  private notificationService: NotificationService;
  private prisma: PrismaClient;
  private constructor() {
    this.prisma = GetPrismaClient.getClient();
    this.event_service = RedisPubSubService.getInstance();
    this.notificationService = NotificationService.getInstance();
  }
  public static getInstance() {
    if (!AnswerService.instance) {
      AnswerService.instance = new AnswerService();
    }
    return AnswerService.instance;
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 300 }, 'user')
  public async createAnswerApi(req: NextRequest, @JwtPayload tokenPayload: jwtPayloadType) {
    let data: CreateAnswerDto;
    try {
      data = await validateStrict(CreateAnswerDto, await req.json());
    } catch (err) {
      return sendApiError(400, `${JSON.stringify(err)}`);
    }
    const questionId = data.questionId;
    const q = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!q) {
      return sendApiError(400, 'No such question');
    }
    if (q.questioneeHandle !== tokenPayload.handle) {
      return sendApiError(403, `This question is not for you`);
    }
    const answeredUser = await this.prisma.user.findUnique({
      where: {
        handle: tokenPayload.handle,
      },
      include: {
        profile: true,
        server: true,
      },
    });
    if (!answeredUser || !answeredUser.profile) {
      return sendApiError(500, 'User or Profile not found');
    }

    const server = answeredUser.server;
    const profile = answeredUser.profile;

    const createdAnswer = await this.prisma.$transaction(async (tr) => {
      const a = await tr.answer.create({
        data: {
          question: q.question,
          questioner: q.isAnonymous ? null : q.questioner,
          answer: data.answer,
          answeredPersonHandle: tokenPayload.handle,
          nsfwedAnswer: data.nsfwedAnswer,
        },
      });
      await tr.question.delete({
        where: {
          id: q.id,
        },
      });
      return a;
    });

    const answerUrl = `${process.env.WEB_URL}/main/user/${answeredUser.handle}/${createdAnswer.id}`;

    if (!profile.stopPostAnswer) {
      let title;
      let text;
      if (data.nsfwedAnswer === true) {
        title = `⚠️ 이 질문은 NSFW한 질문이에요! `;
        if (createdAnswer.questioner) {
          text = `질문자:${createdAnswer.questioner}\nQ:${createdAnswer.question}\nA: ${createdAnswer.answer}\n`;
        } else {
          text = `Q: ${createdAnswer.question}\nA: ${createdAnswer.answer}\n`;
        }
      } else {
        title = `Q: ${createdAnswer.question} `;
        if (createdAnswer.questioner) {
          text = `질문자:${createdAnswer.questioner}\nA: ${createdAnswer.answer}\n `;
        } else {
          text = `A: ${createdAnswer.answer}\n`;
        }
      }
      try {
        const textEnd = ` ${answerUrl}\n#neo_quesdon`;
        const titleEnd = ' #neo_quesdon';
        const more = '...';
        switch (server.instanceType) {
          case 'misskey':
          case 'cherrypick':
            text = clampText(text, 3000, textEnd, more);
            title = clampText(title, 100, titleEnd, more);
            await mkMisskeyNote(
              { user: answeredUser, server: server },
              { title: title, text: text, visibility: data.visibility },
            );
            break;
          case 'mastodon':
            const titleTotalLen = title.length + titleEnd.length;
            const textTotalLen = text.length + textEnd.length;
            const needTrim = titleTotalLen + textTotalLen > 500;
            let titleMax = 500;
            let textMax = 500;
            if (needTrim) {
              titleMax = Math.min(titleTotalLen, 200);
              textMax -= titleMax;
            }
            title = clampText(title, titleMax, titleEnd, more);
            text = clampText(text, textMax, textEnd, more);
            await mastodonToot({ user: answeredUser }, { title: title, text: text, visibility: data.visibility });
            break;
          default:
            break;
        }
      } catch (err) {
        this.logger.warn('노트/툿 업로드 실패!', err);
      }
    }

    const question_numbers = await this.prisma.question.count({ where: { questioneeHandle: tokenPayload.handle } });
    const profileDto = profileToDto(answeredUser.profile, answeredUser.hostName, answeredUser.server.instanceType);
    const answerDto = answerEntityToDto(createdAnswer);
    const answerWithProfileDto = {
      ...answerDto,
      answeredPerson: profileDto,
    };
    this.event_service.pub<QuestionDeletedPayload>('question-deleted-event', {
      deleted_id: q.id,
      handle: answeredUser.handle,
      question_numbers: question_numbers,
    });

    this.event_service.pub<AnswerWithProfileDto>('answer-created-event', answerWithProfileDto);

    if (isHandle(q.questioner)) {
      this.notificationService.AnswerOnMyQuestionNotification(q.questioner!, answerWithProfileDto);
    }
    this.logger.log('Created new answer:', answerUrl);
    return new NextResponse(null, { status: 201 });
  }

  @Auth()
  @RateLimit({ bucket_time: 600, req_limit: 300 }, 'user')
  public async deleteAnswer(req: NextRequest, answerId: string, @JwtPayload tokenPayload: jwtPayloadType) {
    if (!isString(answerId)) {
      return sendApiError(400, 'answerId is not string');
    }
    const prisma = GetPrismaClient.getClient();

    const willBeDeletedAnswer = await prisma.answer.findUnique({
      where: { id: answerId },
    });
    if (!willBeDeletedAnswer) {
      // 그런 답변이 없음
      return sendApiError(404, 'Not Found');
    }
    if (willBeDeletedAnswer.answeredPersonHandle !== tokenPayload!.handle) {
      // 너의 답변이 아님
      return sendApiError(403, 'This is Not Your Answer!');
    }
    try {
      this.logger.log(`Delete answer... : ${answerId}`);
      await prisma.answer.delete({ where: { id: answerId } });
      await this.event_service.pub<AnswerDeletedEvPayload>('answer-deleted-event', { deleted_id: answerId });

      return NextResponse.json({ message: 'Delete Answer Successful' }, { status: 200 });
    } catch (err) {
      this.logger.error('Error: Delete answer:', err);
      return sendApiError(500, `Error ${JSON.stringify(err)}`);
    }
  }

  @Auth({ isOptional: true })
  @RateLimit({ bucket_time: 600, req_limit: 600 }, 'ip')
  public async GetAllAnswersApi(req: NextRequest, @JwtPayload tokenPayload?: jwtPayloadType) {
    const prisma = GetPrismaClient.getClient();
    const searchParams = req.nextUrl.searchParams;

    let data;
    try {
      data = await validateStrict(FetchAllAnswersReqDto, {
        untilId: searchParams.get('untilId') ?? undefined,
        sinceId: searchParams.get('sinceId') ?? undefined,
        sort: searchParams.get('sort') ?? undefined,
        limit: searchParams.get('limit') ?? undefined,
      });
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
        answeredPerson: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        id: orderBy,
      },
      take: query_limit,
    });
    let list: AnswerWithProfileDto[] = [];
    for (const answer of answersWithProfile) {
      const instanceType = (
        await prisma.server.findUniqueOrThrow({
          select: { instanceType: true },
          where: { instances: answer.answeredPerson.user.hostName },
        })
      ).instanceType;
      const answerDto = answerEntityToDto(answer);
      const profileDto = profileToDto(answer.answeredPerson, answer.answeredPerson.user.hostName, instanceType);
      const data: AnswerWithProfileDto = {
        ...answerDto,
        answeredPerson: profileDto,
      };
      list.push(data);
    }

    if (tokenPayload?.handle) {
      // 로그인 상태면 블락 필터링
      list = await this.filterBlock(list, tokenPayload.handle);
    }

    const return_data: AnswerListWithProfileDto = {
      answersList: list,
    };

    return NextResponse.json(return_data, {
      headers: { 'Content-type': 'application/json', 'Cache-Control': 'private, no-store, max-age=0' },
    });
  }

  @RateLimit({ bucket_time: 600, req_limit: 300 }, 'ip')
  public async fetchUserAnswers(req: NextRequest, userHandle: string) {
    const prisma = GetPrismaClient.getClient();
    const searchParams = req.nextUrl.searchParams;
    const query_params = {
      limit: searchParams.get('limit') ?? undefined,
      sinceId: searchParams.get('sinceId') ?? undefined,
      untilId: searchParams.get('untilId') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
    };
    try {
      let data;
      try {
        data = await validateStrict(FetchUserAnswersDto, query_params);
      } catch (err) {
        return sendApiError(400, `${err}`);
      }

      const query_limit = data.limit ? Math.max(1, Math.min(data.limit, 100)) : 100;
      const sinceId = data.sinceId;
      const untilId = data.untilId;

      //내림차순이 기본값
      const orderBy = data.sort === 'ASC' ? 'asc' : 'desc';

      if (!userHandle || !isHandle(userHandle)) {
        return sendApiError(400, 'User handle validation Error!');
      }

      const res = await prisma.answer.findMany({
        where: {
          answeredPersonHandle: userHandle,
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

      const answerCount = await prisma.profile.findMany({
        where: {
          handle: userHandle,
        },
        select: {
          _count: {
            select: {
              answer: true,
            },
          },
        },
      });

      return NextResponse.json(
        {
          answers: res,
          count: answerCount[0]._count.answer,
        },
        { headers: { 'Content-type': 'application/json', 'Cache-Control': 'private, no-store, max-age=0' } },
      );
    } catch (err) {
      this.logger.log(err);
    }
  }

  @RateLimit({ bucket_time: 300, req_limit: 600 }, 'ip')
  public async GetSingleAnswerApi(_req: NextRequest, answerId: string) {
    const answer = await this.prisma.answer.findUnique({
      include: { answeredPerson: { include: { user: { include: { server: { select: { instanceType: true } } } } } } },
      where: {
        id: answerId,
      },
    });
    if (!answer) {
      return sendApiError(404, 'Not found');
    }
    const profileDto = profileToDto(
      answer.answeredPerson,
      answer.answeredPerson.user.hostName,
      answer.answeredPerson.user.server.instanceType,
    );
    const answerDto = answerEntityToDto(answer);
    const dto: AnswerWithProfileDto = {
      ...answerDto,
      answeredPerson: profileDto,
    };
    return NextResponse.json(dto, {
      status: 200,
      headers: { 'Content-type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  }

  public async filterBlock(answers: AnswerWithProfileDto[], myHandle: string) {
    const prisma = GetPrismaClient.getClient();
    const kv = RedisKvCacheService.getInstance();
    const getBlockListOnlyExist = async (): Promise<blocking[]> => {
      const all_blockList = await prisma.blocking.findMany({ where: { blockerHandle: myHandle, hidden: false } });
      const existList = [];
      for (const block of all_blockList) {
        const exist = await prisma.user.findUnique({
          where: { handle: block.blockeeHandle },
        });
        if (exist) {
          existList.push(block);
        }
      }
      return existList;
    };
    const blockList = await kv.get(getBlockListOnlyExist, { key: `block-${myHandle}`, ttl: 600 });
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
}

function answerEntityToDto(answer: answer): AnswerDto {
  const dto: AnswerDto = {
    id: answer.id,
    question: answer.question,
    questioner: answer.questioner,
    answer: answer.answer,
    answeredAt: answer.answeredAt,
    answeredPersonHandle: answer.answeredPersonHandle,
    nsfwedAnswer: answer.nsfwedAnswer,
  };
  return dto;
}

function isHandle(str: string | null | undefined) {
  if (!str) {
    return false;
  }
  const re = new RE2(/^@.+@.+/);
  if (re.exec(str)) {
    return true;
  }
  return false;
}
