import { NextRequest, NextResponse } from 'next/server';
import { sendApiError } from '@/api/_utils/apiErrorResponse/sendApiError';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { UserSettingsDto, UserSettingsUpdateDto } from '@/app/_dto/settings/settings.dto';
import { Auth, JwtPayload } from '@/api/_utils/jwt/decorator';
import type { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { RateLimit } from '@/_service/ratelimiter/decorator';
import RE2 from 're2';
import { RedisPubSubService } from '@/_service/redis-pubsub/redis-event.service';
import { QuestionDeletedPayload } from '@/app/_dto/websocket-event/websocket-event.dto';
import { Body, ValidateBody } from '@/app/api/_utils/Validator/decorator';

export class UserSettingsService {
  private constructor() {}
  private static instance: UserSettingsService;
  public static get() {
    if (!UserSettingsService.instance) {
      UserSettingsService.instance = new UserSettingsService();
    }
    return UserSettingsService.instance;
  }

  @RateLimit(
    {
      bucket_time: 600,
      req_limit: 300,
    },
    'user',
  )
  @Auth()
  public async getSettings(_req: NextRequest, @JwtPayload jwtBody?: jwtPayloadType) {
    const prisma = GetPrismaClient.getClient();
    try {
      const user_profile = await prisma.profile.findUniqueOrThrow({ where: { handle: jwtBody!.handle } });
      const res_body: UserSettingsDto = {
        stopAnonQuestion: user_profile.stopAnonQuestion,
        stopNewQuestion: user_profile.stopNewQuestion,
        stopNotiNewQuestion: user_profile.stopNotiNewQuestion,
        stopPostAnswer: user_profile.stopPostAnswer,
        questionBoxName: user_profile.questionBoxName,
      };
      return NextResponse.json(res_body);
    } catch {
      return sendApiError(400, 'Bad Request', 'BAD_REQUEST');
    }
  }

  @RateLimit(
    {
      bucket_time: 600,
      req_limit: 60,
    },
    'user',
  )
  @Auth()
  @ValidateBody(UserSettingsUpdateDto)
  public async updateSettings(
    _req: NextRequest,
    @Body data: UserSettingsUpdateDto,
    @JwtPayload jwtBody: jwtPayloadType,
  ) {
    const prisma = GetPrismaClient.getClient();
    if (data.wordMuteList) {
      this.onUpdateWordMute(jwtBody.handle, data.wordMuteList);
    }
    const updated = await prisma.profile.update({ where: { handle: jwtBody.handle }, data: data });
    return NextResponse.json(updated);
  }

  private async onUpdateWordMute(userHandle: string, wordMuteList: string[]) {
    // Filter existing questions.
    const prisma = GetPrismaClient.getClient();
    const questions = await prisma.question.findMany({ where: { questioneeHandle: userHandle } });
    const pubsubService = RedisPubSubService.getInstance();
    const deleted_ids: QuestionDeletedPayload['deleted_id'][] = [];
    for (const q of questions) {
      const q_text = q.question;
      for (const word of wordMuteList) {
        const re = new RE2(word);
        const matched = q_text.match(re);
        if (matched) {
          const d = await prisma.question.delete({ where: { id: q.id } });
          deleted_ids.push(d.id);
        }
      }
    }
    deleted_ids.forEach(async (deleted_id) => {
      const ev_payload: QuestionDeletedPayload = {
        deleted_id: deleted_id,
        question_numbers: questions.length - deleted_ids.length,
        handle: userHandle,
      };
      await pubsubService.pub<QuestionDeletedPayload>('question-deleted-event', ev_payload);
    });
  }
}
