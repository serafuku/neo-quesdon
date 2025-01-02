import { RateLimit } from '@/app/api/_service/ratelimiter/decorator';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Auth, JwtPayload } from '@/app/api/_utils/jwt/decorator';
import type { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { Logger } from '@/utils/logger/Logger';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export class LogoutAllService {
  private static instance: LogoutAllService;
  private logger = new Logger('LogoutAllService');
  private prisma: PrismaClient;
  private constructor() {
    this.prisma = GetPrismaClient.getClient();
  }

  public static getInstance() {
    if (!LogoutAllService.instance) {
      LogoutAllService.instance = new LogoutAllService();
    }
    return LogoutAllService.instance;
  }

  @Auth()
  @RateLimit({ bucket_time: 300, req_limit: 10 }, 'ip')
  public async logoutAll(_req: NextRequest, @JwtPayload tokenBody?: jwtPayloadType) {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({ where: { handle: tokenBody!.handle } });

      const updated = await this.prisma.user.update({
        where: { handle: tokenBody!.handle },
        data: { jwtIndex: user.jwtIndex + 1 },
      });
      const cookieStore = await cookies();

      cookieStore.delete('jwtToken');
      cookieStore.delete('server');
      cookieStore.delete('handle');
      this.logger.log(`Logout-all: ${user.handle}, new JWT index: ${updated.jwtIndex}`);

      return NextResponse.json({ message: 'OK' }, { status: 200 });
    } catch (err) {
      this.logger.error(err);
      return sendApiError(500, 'Error!', 'SERVER_ERROR');
    }
  }
}
