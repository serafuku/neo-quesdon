import { loginReqDto } from '@/app/_dto/web/login/login.dto';
import { validateStrict } from '@/utils/validator/strictValidator';
import { NextRequest, NextResponse } from 'next/server';
import { MiApiError, MiAuthSession } from '@/app';
import detectInstance from '@/utils/detectInstance/detectInstance';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { RateLimiterService } from '@/_service/ratelimiter/rateLimiterService';
import { getIpHash } from '@/app/api/_utils/getIp/get-ip-hash';
import { getIpFromRequest } from '@/app/api/_utils/getIp/get-ip-from-Request';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { RedisService } from '@/app/api/_service/redisService/redis-service';

const logger = new Logger('misskey-login');
export async function POST(req: NextRequest) {
  const prisma = GetPrismaClient.getClient();
  let data: loginReqDto;
  try {
    data = await validateStrict(loginReqDto, await req.json());
  } catch (err) {
    return sendApiError(400, `${err}`, 'BAD_REQUEST');
  }

  const limiter = RateLimiterService.getLimiter();
  const ipHash = getIpHash(getIpFromRequest(req));
  const limited = await limiter.limit(`misskey-login-${ipHash}`, {
    bucket_time: 600,
    req_limit: 60,
  });
  if (limited) {
    return sendApiError(429, 'Rate Limited! Try Again Later', 'RATE_LIMITED');
  }

  const misskeyHost = data.host.toLowerCase();

  try {
    const serverInfo = await prisma.server.findFirst({
      where: {
        instances: misskeyHost,
      },
    });

    // 인스턴스의 첫 번째 로그인이거나, 앱시크릿이 유효하지 않은 경우
    if (serverInfo === null || serverInfo.appSecret === null) {
      const payload = {
        name: 'Neo-Quesdon',
        description: '새로운 퀘스돈, 네오-퀘스돈입니다.',
        permission: ['read:account', 'read:blocks', 'read:following', 'write:notes'],
        callbackUrl: `${process.env.WEB_URL}/misskey-callback`,
      };

      // Create New App in instance
      const res = await fetch(`https://${misskeyHost}/api/app/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        return sendApiError(500, `Login Error! From Remote: ${await res.text()}`, 'MISSKEY_ERROR');
      }
      const data = await res.json();
      const appSecret = data.secret;
      logger.log('New Misskey APP created!', data);
      const detectedInstanceType = (await detectInstance(misskeyHost)) === 'cherrypick' ? 'cherrypick' : 'misskey';
      await prisma.server.upsert({
        where: {
          instances: misskeyHost,
        },
        update: {
          appSecret: appSecret,
          instanceType: detectedInstanceType,
        },
        create: {
          appSecret: appSecret,
          instances: misskeyHost,
          instanceType: detectedInstanceType,
        },
      });
      const authRes = await initiateMisskeyAuthSession(misskeyHost, appSecret);
      if (!authRes.ok) {
        return sendApiError(500, `Fail to Create Auth Session: ${await authRes.text()}`, 'SERVER_ERROR');
      }
      const misskeyAuthSession = (await authRes.json()) as MiAuthSession;
      const redis = RedisService.getRedis();
      await redis.setex(`login/misskey/${misskeyAuthSession.token}`, 90, `${misskeyAuthSession.token}`);
      logger.log(`New Misskey Auth Session Created: `, misskeyAuthSession);
      return NextResponse.json(misskeyAuthSession);
    }
    // 앱 시크릿 존재하는 경우
    else {
      const res = await initiateMisskeyAuthSession(misskeyHost, serverInfo.appSecret);
      if (!res.ok) {
        const data = (await res.json()) as MiApiError;
        if (data.error.code === 'NO_SUCH_APP') {
          // 어라라...? 앱 스크릿 무효화
          logger.warn(`Misskey response NO_SUCH_APP, delete invalid appSecret from DB`);
          await prisma.server.update({
            where: { instances: misskeyHost },
            data: { appSecret: null },
          });
        }
        return sendApiError(500, `Fail to Create Misskey Auth Session`, 'SERVER_ERROR');
      }
      const misskeyAuthSession = (await res.json()) as MiAuthSession;
      const redis = RedisService.getRedis();
      await redis.setex(`login/misskey/${misskeyAuthSession.token}`, 90, `${misskeyAuthSession.token}`);
      logger.log(`New Misskey Auth Session Created: `, misskeyAuthSession);
      return NextResponse.json(misskeyAuthSession);
    }
  } catch (err) {
    return sendApiError(500, `login error... ${err}`, 'SERVER_ERROR');
  }
}

/**
 * initiate Misskey App Auth Session
 * @param host misskey host
 * @param appSecret Misskey AppSecret
 * @returns Misskey API Response
 */
async function initiateMisskeyAuthSession(host: string, appSecret: string): Promise<Response> {
  return await fetch(`https://${host}/api/auth/session/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appSecret: appSecret,
    }),
  });
}
