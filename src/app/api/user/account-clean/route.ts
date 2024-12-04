import { NextRequest, NextResponse } from 'next/server';
import { Auth, JwtPayload } from '../../_utils/jwt/decorator';
import type { jwtPayloadType } from '../../_utils/jwt/jwtPayloadType';
import { validateStrict } from '@/utils/validator/strictValidator';
import { AccountCleanReqDto } from '@/app/_dto/account-clean/account-clean.dto';
import { sendApiError } from '../../_utils/apiErrorResponse/sendApiError';
import { RateLimit } from '../../_service/ratelimiter/decorator';
import { QueueService } from '../../_service/queue/queueService';
import { GetPrismaClient } from '../../_utils/getPrismaClient/get-prisma-client';

export async function POST(req: NextRequest) {
  return cleanService.clean(req);
}

class cleanService {
  @Auth()
  @RateLimit({ bucket_time: 60, req_limit: 2 }, 'ip')
  public static async clean(req: NextRequest, @JwtPayload tokenBody?: jwtPayloadType) {
    try {
      let data;
      try {
        data = await validateStrict(AccountCleanReqDto, await req.json());
      } catch (err) {
        return sendApiError(400, ['bad request', JSON.stringify(err)]);
      }
      if (tokenBody?.handle !== data.handle) {
        return sendApiError(401, 'Auth Fail: this is not your handle!');
      }
      const prisma = GetPrismaClient.getClient();
      const queue = QueueService.get();
      const user = await prisma.user.findUniqueOrThrow({ where: { handle: data.handle } });
      await queue.addAccountCleanJob(user);
      return NextResponse.json({ message: 'OK. queued.' }, { status: 202 });
    } catch {
      return sendApiError(500, 'ERROR!');
    }
  }
}
