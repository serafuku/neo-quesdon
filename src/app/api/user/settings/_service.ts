import { NextRequest, NextResponse } from 'next/server';
import { sendApiError } from '@/api/_utils/apiErrorResponse/sendApiError';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { UserSettingsDto, UserSettingsUpdateDto } from '@/app/_dto/settings/settings.dto';
import { validateStrict } from '@/utils/validator/strictValidator';
import { Auth, JwtPayload } from '@/api/_utils/jwt/decorator';
import type { jwtPayload } from '@/api/_utils/jwt/jwtPayload';
import { RateLimit } from '@/api/_utils/ratelimiter/decorator';

export class UserSettingsService {
  private constructor() {}
  private static instance: UserSettingsService;
  public static get() {
    if (!UserSettingsService.instance) {
      UserSettingsService.instance = new UserSettingsService();
    }
    return UserSettingsService.instance;
  }

  @RateLimit({
    bucket_time: 600,
    req_limit: 300,
  }, 'user')
  @Auth()
  public async getSettings(_req: NextRequest, @JwtPayload jwtBody?: jwtPayload) {
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
      return sendApiError(400, 'Bad Request');
    }
  }

  @RateLimit({
    bucket_time: 600,
    req_limit: 60,
  }, 'user')
  @Auth()
  public async updateSettings(req: NextRequest, @JwtPayload jwtBody?: jwtPayload) {
    let data;
    try {
      const body = await req.json();
      data = await validateStrict(UserSettingsUpdateDto, body);
    } catch {
      return sendApiError(400, 'Bad Request');
    }
    const prisma = GetPrismaClient.getClient();
    const updated = await prisma.profile.update({ where: { handle: jwtBody!.handle }, data: data });
    return NextResponse.json(updated);
  }
}
