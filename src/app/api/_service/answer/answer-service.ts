import { sendApiError } from '@/api/_utils/apiErrorResponse/sendApiError';
import { validateStrict } from '@/utils/validator/strictValidator';
import { NextRequest, NextResponse } from 'next/server';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import type { jwtPayloadType } from '@/api/_utils/jwt/jwtPayloadType';
import { Auth, JwtPayload } from '@/api/_utils/jwt/decorator';
import { RateLimit } from '@/_service/ratelimiter/decorator';
import { userProfileDto } from '@/app/_dto/fetch-profile/Profile.dto';
import { $Enums, blocking, profile, user, server, PrismaClient } from '@prisma/client';
import { AnswerListWithProfileDto, AnswerWithProfileDto } from '@/app/_dto/Answers.dto';
import { FetchAllAnswersReqDto } from '@/app/_dto/fetch-all-answers/fetch-all-answers.dto';
import { FetchUserAnswersDto } from '@/app/_dto/fetch-user-answers/fetch-user-answers.dto';
import { RedisKvCacheService } from '@/app/api/_service/kvCache/redisKvCacheService';
import { RedisPubSubService } from '@/_service/redis-pubsub/redis-event.service';
import { AnswerDeletedEvPayload, QuestionDeletedPayload } from '@/app/_dto/websocket-event/websocket-event.dto';
import { CreateAnswerDto } from '@/app/_dto/create-answer/create-answer.dto';
import { profileToDto } from '@/api/_utils/profileToDto';
import { mastodonTootAnswers, MkNoteAnswers } from '@/app';
import { createHash } from 'crypto';
import { isString } from 'class-validator';
import RE2 from 're2';

export class AnswerService {
  private static instance: AnswerService;
  private logger = new Logger('AnswerService');
  private event_service: RedisPubSubService;
  private prisma: PrismaClient;
  private constructor() {
    this.prisma = GetPrismaClient.getClient();
    this.event_service = RedisPubSubService.getInstance();
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
    const createdAnswer = await this.prisma.answer.create({
      data: {
        question: q.question,
        questioner: q.questioner,
        answer: data.answer,
        answeredPersonHandle: tokenPayload.handle,
        nsfwedAnswer: data.nsfwedAnswer,
      },
    });
    const answerUrl = `${process.env.WEB_URL}/main/user/${answeredUser.handle}/${createdAnswer.id}`;

    if (!profile.stopPostAnswer) {
      let title;
      let text;
      if (data.nsfwedAnswer === true) {
        title = `⚠️ 이 질문은 NSFW한 질문이에요! #neo_quesdon`;
        if (q.questioner) {
          text = `질문자:${q.questioner}\nQ:${q.question}\nA: ${data.answer}\n#neo_quesdon ${answerUrl}`;
        } else {
          text = `Q: ${q.question}\nA: ${data.answer}\n#neo_quesdon ${answerUrl}`;
        }
      } else {
        title = `Q: ${q.question} #neo_quesdon`;
        if (q.questioner) {
          text = `질문자:${q.questioner}\nA: ${data.answer}\n#neo_quesdon ${answerUrl}`;
        } else {
          text = `A: ${data.answer}\n#neo_quesdon ${answerUrl}`;
        }
      }
      try {
        switch (server.instanceType) {
          case 'misskey':
          case 'cherrypick':
            await mkMisskeyNote(
              { user: answeredUser, server: server },
              { title: title, text: text, visibility: data.visibility },
            );
            break;
          case 'mastodon':
            await mastodonToot({ user: answeredUser }, { title: title, text: text, visibility: data.visibility });
            break;
          default:
            break;
        }
      } catch (err) {
        this.logger.warn('답변 작성 실패!', err);
        /// 미스키/마스토돈에 글 올리는데 실패했으면 다시 answer 삭제
        await this.prisma.answer.delete({ where: { id: createdAnswer.id } });
        sendApiError(500, '답변 작성에 실패했어요!');
      }
    }

    await this.prisma.question.delete({
      where: {
        id: q.id,
      },
    });

    const question_numbers = await this.prisma.question.count({ where: { questioneeHandle: tokenPayload.handle } });
    const profileDto = profileToDto(answeredUser.profile, answeredUser.hostName, answeredUser.server.instanceType);
    this.event_service.pub<QuestionDeletedPayload>('question-deleted-event', {
      deleted_id: q.id,
      handle: answeredUser.handle,
      question_numbers: question_numbers,
    });
    this.event_service.pub<AnswerWithProfileDto>('answer-created-event', {
      id: createdAnswer.id,
      question: createdAnswer.question,
      questioner: createdAnswer.questioner,
      answer: createdAnswer.answer,
      answeredAt: createdAnswer.answeredAt,
      answeredPerson: profileDto,
      answeredPersonHandle: createdAnswer.answeredPersonHandle,
      nsfwedAnswer: createdAnswer.nsfwedAnswer,
    });

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
      const data: AnswerWithProfileDto = {
        id: answer.id,
        question: answer.question,
        questioner: answer.questioner,
        answer: answer.answer,
        answeredAt: answer.answeredAt,
        answeredPersonHandle: answer.answeredPersonHandle,
        answeredPerson: this.profileToDto(answer.answeredPerson, answer.answeredPerson.user.hostName, instanceType),
        nsfwedAnswer: answer.nsfwedAnswer,
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

      const re = new RE2(/^@.+@.+/);
      if (!userHandle || !re.match(userHandle)) {
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

  private profileToDto(profile: profile, hostName: string, instanceType: $Enums.InstanceType): userProfileDto {
    const data: userProfileDto = {
      handle: profile.handle,
      name: profile.name,
      stopNewQuestion: profile.stopNewQuestion,
      stopAnonQuestion: profile.stopAnonQuestion,
      stopNotiNewQuestion: profile.stopNotiNewQuestion,
      avatarUrl: profile.avatarUrl,
      questionBoxName: profile.questionBoxName,
      hostname: hostName,
      instanceType: instanceType,
    };
    return data;
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

async function mkMisskeyNote(
  {
    user,
    server,
  }: {
    user: user;
    server: server;
  },
  {
    title,
    text,
    visibility,
  }: {
    title: string;
    text: string;
    visibility: MkNoteAnswers['visibility'];
  },
) {
  const NoteLogger = new Logger('mkMisskeyNote');
  // 미스키 CW길이제한 처리
  if (title.length > 100) {
    title = title.substring(0, 90) + '.....';
  }
  const i = createHash('sha256')
    .update(user.token + server.appSecret, 'utf-8')
    .digest('hex');
  const newAnswerNote: MkNoteAnswers = {
    i: i,
    cw: title,
    text: text,
    visibility: visibility,
  };
  try {
    const res = await fetch(`https://${user.hostName}/api/notes/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${i}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newAnswerNote),
    });
    if (res.status === 401 || res.status === 403) {
      NoteLogger.warn('User Revoked Access token. JWT를 Revoke합니다... Detail:', await res.text());
      const prisma = GetPrismaClient.getClient();
      await prisma.user.update({ where: { handle: user.handle }, data: { jwtIndex: user.jwtIndex + 1 } });
      throw new Error('Note Create Fail! (Token Revoked)');
    } else if (!res.ok) {
      throw new Error(`Note Create Fail! ${await res.text()}`);
    } else {
      NoteLogger.log(`Note Created! ${res.statusText}`);
    }
  } catch (err) {
    NoteLogger.warn(err);
    throw err;
  }
}

async function mastodonToot(
  {
    user,
  }: {
    user: user;
  },
  {
    title,
    text,
    visibility,
  }: {
    title: string;
    text: string;
    visibility: MkNoteAnswers['visibility'];
  },
) {
  const tootLogger = new Logger('mastodonToot');
  let newVisibility: 'public' | 'unlisted' | 'private';
  switch (visibility) {
    case 'public':
      newVisibility = 'public';
      break;
    case 'home':
      newVisibility = 'unlisted';
      break;
    case 'followers':
      newVisibility = 'private';
      break;
    default:
      newVisibility = 'public';
      break;
  }
  const newAnswerToot: mastodonTootAnswers = {
    spoiler_text: title,
    status: text,
    visibility: newVisibility,
  };
  try {
    const res = await fetch(`https://${user.hostName}/api/v1/statuses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newAnswerToot),
    });
    if (res.status === 401 || res.status === 403) {
      tootLogger.warn('User Revoked Access token. JWT를 Revoke합니다.. Detail:', await res.text());
      const prisma = GetPrismaClient.getClient();
      await prisma.user.update({ where: { handle: user.handle }, data: { jwtIndex: user.jwtIndex + 1 } });
      throw new Error('Toot Create Fail! (Token Revoked)');
    } else if (!res.ok) {
      throw new Error(`HTTP Error! status:${await res.text()}`);
    } else {
      tootLogger.log(`Toot Created! ${res.statusText}`);
    }
  } catch (err) {
    tootLogger.warn(`Toot Create Fail!`, err);
    throw err;
  }
}
