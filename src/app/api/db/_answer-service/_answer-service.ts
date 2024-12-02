import { DeleteAnswerDto } from '@/app/_dto/delete-answer/delete-answer.dto';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { validateStrict } from '@/utils/validator/strictValidator';
import { NextRequest, NextResponse } from 'next/server';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import type { jwtPayload } from '../../_utils/jwt/jwtPayload';
import { Auth, JwtPayload } from '../../_utils/jwt/decorator';
import { RateLimit } from '../../_utils/ratelimiter/decorator';
import { userProfileDto } from '@/app/_dto/fetch-profile/Profile.dto';
import { $Enums, profile } from '@prisma/client';
import { AnswerListWithProfileDto, AnswerWithProfileDto } from '@/app/_dto/Answers.dto';
import { FetchAllAnswersReqDto } from '@/app/_dto/fetch-all-answers/fetch-all-answers.dto';
import { FetchUserAnswersDto } from '@/app/_dto/fetch-user-answers/fetch-user-answers.dto';

export class AnswerService {
  private static instance: AnswerService;
  private logger = new Logger('AnswerService');
  private constructor() {}
  public static get() {
    if (!AnswerService.instance) {
      AnswerService.instance = new AnswerService();
    }
    return AnswerService.instance;
  }

  @Auth()
  @RateLimit({ bucket_time: 600, req_limit: 300 }, 'user')
  public async deleteAnswer(req: NextRequest, @JwtPayload tokenPayload?: jwtPayload) {
    let data: DeleteAnswerDto;
    try {
      data = await validateStrict(DeleteAnswerDto, await req.json());
    } catch (err) {
      return sendApiError(400, `Bad Request ${err}`);
    }
    const prisma = GetPrismaClient.getClient();

    const willBeDeletedAnswer = await prisma.answer.findUnique({
      where: { id: data.id },
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
      this.logger.log(`Delete answer... : ${data.id}`);
      await prisma.answer.delete({ where: { id: data.id } });

      return NextResponse.json({ message: 'Delete Answer Successful' }, { status: 200 });
    } catch (err) {
      this.logger.error('Error: Delete answer:', err);
      return sendApiError(500, `Error ${JSON.stringify(err)}`);
    }
  }

  @Auth({ isOptional: true })
  @RateLimit({ bucket_time: 600, req_limit: 600 }, 'ip')
  public async fetchAll(req: NextRequest, @JwtPayload tokenPayload?: jwtPayload) {
    const prisma = GetPrismaClient.getClient();

    let data;
    try {
      data = await validateStrict(FetchAllAnswersReqDto, await req.json());
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
  public async fetchUserAnswers(req: NextRequest) {
    const prisma = GetPrismaClient.getClient();
    try {
      let data;
      try {
        data = await validateStrict(FetchUserAnswersDto, await req.json());
      } catch (err) {
        return sendApiError(400, `${err}`);
      }

      const query_limit = data.limit ? Math.max(1, Math.min(data.limit, 100)) : 100;
      const sinceId = data.sinceId;
      const untilId = data.untilId;

      //내림차순이 기본값
      const orderBy = data.sort === 'ASC' ? 'asc' : 'desc';

      if (!data.answeredPersonHandle) {
        throw new Error(`answeredPersonHandle is null`);
      }
      const res = await prisma.answer.findMany({
        where: {
          answeredPersonHandle: data.answeredPersonHandle,
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
          handle: data.answeredPersonHandle,
        },
        select: {
          _count: {
            select: {
              answer: true,
            },
          },
        },
      });

      return NextResponse.json({
        answers: res,
        count: answerCount[0]._count.answer,
      });
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

  private async filterBlock(answers: AnswerWithProfileDto[], myHandle: string) {
    const prisma = GetPrismaClient.getClient();
    const blockList = await prisma.blocking.findMany({ where: { blockerHandle: myHandle, hidden: false } });
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
