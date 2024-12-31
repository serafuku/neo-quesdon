/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { Auth, JwtPayload } from '../../_utils/jwt/decorator';
import type { jwtPayloadType } from '../../_utils/jwt/jwtPayloadType';
import { AccountCleanReqDto } from '@/app/_dto/account-clean/account-clean.dto';
import { sendApiError } from '../../_utils/apiErrorResponse/sendApiError';
import { RateLimit } from '../../_service/ratelimiter/decorator';
import { QueueService } from '../../_service/queue/queueService';
import { GetPrismaClient } from '../../_utils/getPrismaClient/get-prisma-client';
import { Body, ValidateBody } from '@/app/api/_utils/Validator/decorator';

export async function POST(req: NextRequest) {
  return cleanService.clean(req, null as any, null as any);
}

class cleanService {
  @Auth()
  @RateLimit({ bucket_time: 60, req_limit: 2 }, 'ip')
  @ValidateBody(AccountCleanReqDto)
  public static async clean(_req: NextRequest, @JwtPayload tokenBody: jwtPayloadType, @Body data: AccountCleanReqDto) {
    try {
      if (tokenBody?.handle !== data.handle) {
        return sendApiError(403, 'Auth Fail: this is not your handle!', 'FORBIDDEN');
      }
      const prisma = GetPrismaClient.getClient();
      const queue = QueueService.get();
      const user = await prisma.user.findUniqueOrThrow({ where: { handle: data.handle } });
      await queue.addAccountCleanJob(user);
      return NextResponse.json({ message: 'OK. queued.' }, { status: 202 });
    } catch {
      return sendApiError(500, 'ERROR!', 'SERVER_ERROR');
    }
  }
}
