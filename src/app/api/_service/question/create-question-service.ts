import { CreateQuestionDto } from '@/app/_dto/create_question/create-question.dto';
import type { user } from '@prisma/client';
import { type NextRequest, NextResponse } from 'next/server';
import { validateStrict } from '@/utils/validator/strictValidator';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { Auth, JwtPayload } from '@/api/_utils/jwt/decorator';
import type { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { RateLimit } from '@/_service/ratelimiter/decorator';
import re2 from 're2';
import { RedisPubSubService } from '@/app/api/_service/redis-pubsub/redis-event.service';
import { QuestionCreatedPayload } from '@/app/_dto/websocket-event/websocket-event.dto';

export class CreateQuestionApiService {
  private logger = new Logger('create-question');
  private static instance: CreateQuestionApiService;
  private eventService: RedisPubSubService;
  private constructor() {
    this.eventService = RedisPubSubService.getInstance();
  }
  public static get() {
    if (!CreateQuestionApiService.instance) {
      CreateQuestionApiService.instance = new CreateQuestionApiService();
    }
    return CreateQuestionApiService.instance;
  }

  @RateLimit({ bucket_time: 100, req_limit: 10 }, 'user-or-ip')
  @Auth({ isOptional: true })
  public async CreateQuestion(req: NextRequest, @JwtPayload tokenPayload?: jwtPayloadType) {
    const prisma = GetPrismaClient.getClient();

    try {
      let data;
      try {
        data = await validateStrict(CreateQuestionDto, await req.json());
      } catch (errors) {
        this.logger.warn(errors);
        return sendApiError(400, `${errors}`);
      }

      const questionee_user = await prisma.user.findUniqueOrThrow({
        where: {
          handle: data.questionee,
        },
      });
      const questionee_profile = await prisma.profile.findUniqueOrThrow({
        where: {
          handle: questionee_user.handle,
        },
      });

      if (questionee_profile.stopAnonQuestion && !data.questioner) {
        this.logger.debug('The user has prohibits anonymous questions.');
        throw new Error('The user has prohibits anonymous questions.');
      } else if (questionee_profile.stopNewQuestion) {
        this.logger.debug('User stops NewQuestion');
        throw new Error('User stops NewQuestion');
      }
      // 블락 여부 검사
      if (tokenPayload?.handle) {
        const blocked = await prisma.blocking.findFirst({
          where: { blockeeHandle: tokenPayload.handle, blockerHandle: questionee_user.handle },
        });
        if (blocked) {
          return sendApiError(403, '이 사용자에게 질문을 보낼 수 없습니다!');
        }
      }

      // 제시된 questioner 핸들이 JWT토큰의 핸들과 일치하는지 검사
      if (data.questioner) {
        try {
          if (!tokenPayload) {
            throw new Error(`No Auth Token`);
          }
          if (tokenPayload.handle !== data.questioner) {
            throw new Error(`Token and questioner not match`);
          }
        } catch (err) {
          this.logger.warn(`questioner verify ERROR! ${err}`);
          return sendApiError(403, `${err}`);
        }
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
      const newQuestion = await prisma.question.create({
        data: {
          question: data.question,
          questioner: data.questioner,
          questioneeHandle: data.questionee,
        },
      });

      // 웹소켓으로 업데이트 전송
      const question_numbers = await prisma.question.count({
        where: {
          questioneeHandle: questionee_user.handle,
        },
      });
      const ev_data: QuestionCreatedPayload = {
        id: newQuestion.id,
        question: newQuestion.question,
        questioneeHandle: newQuestion.questioneeHandle,
        questionedAt: newQuestion.questionedAt,
        questioner: newQuestion.questioner,
        question_numbers: question_numbers,
      };
      this.eventService.pub<QuestionCreatedPayload>('question-created-event', ev_data);

      const userSettings = await prisma.profile.findUnique({
        where: {
          handle: data.questionee,
        },
      });

      if (userSettings && userSettings.stopNotiNewQuestion === true) {
        // 알림 전송 스킵
      } else {
        // 알림 전송
        const url = `${process.env.WEB_URL}/main/questions`;
        this.sendNotify(questionee_user, data.questioner, newQuestion.question, url);
      }

      // notify send 기다라지 않고 200반환
      return NextResponse.json({}, { status: 200 });
    } catch (err) {
      return NextResponse.json(`Error! ${err}`, { status: 500 });
    }
  }

  private async sendNotify(questionee: user, questioner: string | null, question: string, url: string): Promise<void> {
    const notify_host = process.env.NOTI_HOST;
    this.logger.log(`try to send notification to ${questionee.handle}`);
    try {
      const res = await fetch(`https://${notify_host}/api/notes/create`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.NOTI_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visibleUserIds: [questionee.userId],
          visibility: 'specified',
          text: `${questionee.handle} <네오-퀘스돈> 새로운 질문이에요!\n질문자: ${questioner ? `\`${questioner}\`` : '익명의 질문자'}\nQ. ${question}\n ${url}`,
        }),
      });
      if (!res.ok) {
        throw new Error(`Note create error ${await res.text()}`);
      } else {
        this.logger.log(`Notification Sent to ${questionee.handle}`);
      }
    } catch (error) {
      this.logger.error('Post-question: fail to send notify: ', error);
    }
  }
}
