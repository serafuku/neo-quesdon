import { CreateQuestionDto } from '@/app/_dto/questions/create-question.dto';
import type { PrismaClient, question, user } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { validateStrict } from '@/utils/validator/strictValidator';
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
      const questions = await this.prisma.question.findMany({
        where: { questioneeHandle: tokenPayload.handle },
        orderBy: { questionedAt: 'desc' },
      });
      const questionDtos = questions.map((q) => questionEntityToDto(q));
      return NextResponse.json(questionDtos, {
        status: 200,
        headers: { 'Cache-Control': 'private, no-store, max-age=0' },
      });
    } catch {
      sendApiError(500, 'Fail to Get my Questions');
    }
  }

  @RateLimit({ bucket_time: 100, req_limit: 10 }, 'user-or-ip')
  @Auth({ isOptional: true })
  public async CreateQuestionApi(req: NextRequest, @JwtPayload tokenPayload?: jwtPayloadType) {
    try {
      let data;
      try {
        data = await validateStrict(CreateQuestionDto, await req.json());
      } catch (errors) {
        this.logger.warn(errors);
        return sendApiError(400, `${errors}`);
      }

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

      if (questionee_profile.stopAnonQuestion && data.isAnonymous) {
        this.logger.debug('The user has prohibits anonymous questions.');
        return sendApiError(403, 'The user has prohibits anonymous questions.');
      } else if (questionee_profile.stopNewQuestion) {
        this.logger.debug('User stops NewQuestion');
        return sendApiError(403, 'User stops NewQuestion');
      }
      // 블락 여부 검사
      if (tokenPayload?.handle) {
        const blocked = await this.prisma.blocking.findFirst({
          where: { blockeeHandle: tokenPayload.handle, blockerHandle: questionee_user.handle },
        });
        if (blocked) {
          return sendApiError(403, '이 사용자에게 질문을 보낼 수 없습니다!');
        }
      }

      if (!data.isAnonymous && !tokenPayload?.handle) {
        this.logger.warn(`You must log in to send non-anonymous questions.`);
        return sendApiError(403, `You must log in to send non-anonymous questions.`);
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
        return sendApiError(400, 'Bad QuestionId');
      }
      const q = await this.prisma.question.findUnique({ where: { id: id } });
      if (!q) {
        return sendApiError(400, 'No such question!');
      }
      if (q.questioneeHandle !== tokenPayload.handle) {
        return sendApiError(403, 'You can not delete this question!');
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
      return sendApiError(500, 'Fail to Delete question!');
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
      return sendApiError(500, 'Fail to delete questions');
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
