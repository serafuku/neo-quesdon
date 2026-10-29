import { NextRequest, NextResponse } from 'next/server';
import { sendApiError } from '@/api/_utils/apiErrorResponse/sendApiError';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { UserSettingsUpdateDto } from '@/app/_dto/settings/settings.dto';
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
      // 저장 전에 정규식 유효성을 검사한다.
      // 유효하지 않은 정규식이 저장되면 이후 해당 유저에게 오는 모든 질문이
      // 워드뮤트 매칭 중 throw 되어 500 을 반환하게 된다.
      const invalidPattern = data.wordMuteList.find((word) => {
        try {
          new RE2(word);
          return false;
        } catch {
          return true;
        }
      });
      if (invalidPattern !== undefined) {
        return sendApiError(400, `Invalid regular expression in wordMuteList: ${invalidPattern.slice(0, 100)}`, 'BAD_REQUEST');
      }
      await this.onUpdateWordMute(jwtBody.handle, data.wordMuteList);
    }
    try {
      const updated = await prisma.profile.update({ where: { handle: jwtBody.handle }, data: data });
      return NextResponse.json(updated);
    } catch {
      return sendApiError(500, `Update Settings Error`, 'SERVER_ERROR');
    }
  }

  private async onUpdateWordMute(userHandle: string, wordMuteList: string[]) {
    // Filter existing questions.
    const prisma = GetPrismaClient.getClient();
    const questions = await prisma.question.findMany({ where: { questioneeHandle: userHandle } });
    const pubsubService = RedisPubSubService.getInstance();

    // 정규식을 미리 컴파일한다. (질문 수 x 패턴 수 만큼 재컴파일하지 않도록)
    const regexes = wordMuteList
      .map((word) => {
        try {
          return new RE2(word);
        } catch {
          // updateSettings 에서 사전 검증했으므로 여기서 실패하는 패턴은 없어야 하지만,
          // 방어적으로 무시한다.
          return undefined;
        }
      })
      .filter((re): re is RE2 => re !== undefined);

    const deleted_ids: QuestionDeletedPayload['deleted_id'][] = [];
    for (const q of questions) {
      const matched = regexes.some((re) => q.question.match(re));
      if (matched) {
        await prisma.question.delete({ where: { id: q.id } });
        deleted_ids.push(q.id);
      }
    }
    for (const deleted_id of deleted_ids) {
      const ev_payload: QuestionDeletedPayload = {
        deleted_id: deleted_id,
        question_numbers: questions.length - deleted_ids.length,
        handle: userHandle,
      };
      await pubsubService.pub<QuestionDeletedPayload>('question-deleted-event', ev_payload);
    }
  }
}
