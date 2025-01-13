import { AccountDeleteReqDto } from '@/app/_dto/account-delete/account-delete.dto';
import { RateLimit } from '@/app/api/_service/ratelimiter/decorator';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Auth, JwtPayload } from '@/app/api/_utils/jwt/decorator';
import { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { Body, ValidateBody } from '@/app/api/_utils/Validator/decorator';
import { Logger } from '@/utils/logger/Logger';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export class AccountDeleteService {
  private logger: Logger;
  private prisma: PrismaClient;
  private static instance: AccountDeleteService;
  private constructor() {
    this.logger = new Logger('AccountDeleteService');
    this.prisma = GetPrismaClient.getClient();
  }
  public static getInstance() {
    if (!AccountDeleteService.instance) {
      AccountDeleteService.instance = new AccountDeleteService();
    }
    return AccountDeleteService.instance;
  }

  @ValidateBody(AccountDeleteReqDto)
  @Auth()
  @RateLimit({ bucket_time: 60, req_limit: 60 }, 'ip')
  public async deleteAccountApi(
    _req: NextRequest,
    @Body body: AccountDeleteReqDto,
    @JwtPayload tokenBody: jwtPayloadType,
  ): Promise<NextResponse> {
    if (body.handle !== tokenBody.handle) {
      return sendApiError(401, 'Handle not match with JWT handle', 'UNAUTHORIZED');
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { handle: tokenBody.handle } });
    this.logger.log(`Delete user ${user.handle}`);
    await this.prisma.question.deleteMany({ where: { questioneeHandle: user.handle } });
    await this.prisma.answer.deleteMany({ where: { answeredPersonHandle: user.handle } });
    await this.prisma.following.deleteMany({ where: { followerHandle: user.handle } });
    await this.prisma.blocking.deleteMany({ where: { blockerHandle: user.handle } });
    await this.prisma.notification.deleteMany({ where: { userHandle: user.handle } });
    await this.prisma.profile.delete({ where: { handle: user.handle } });
    await this.prisma.user.delete({ where: { handle: user.handle } });
    this.logger.log(`User ${user.handle} deleted!`);
    return NextResponse.json({ message: 'Good bye' }, { status: 200 });
  }
}
