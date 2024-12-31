import { loginReqDto } from '@/app/_dto/web/login/login.dto';
import { validateStrict } from '@/utils/validator/strictValidator';
import { NextRequest, NextResponse } from 'next/server';
import { GetPrismaClient } from '@/app/api/_utils//getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { RateLimiterService } from '@/_service/ratelimiter/rateLimiterService';
import { getIpHash } from '@/app/api/_utils/getIp/get-ip-hash';
import { getIpFromRequest } from '@/app/api/_utils/getIp/get-ip-from-Request';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { randomUUID } from 'crypto';
import { RedisService } from '@/app/api/_service/redisService/redis-service';

const logger = new Logger('mastodon-login');
export async function POST(req: NextRequest) {
  let data: loginReqDto;
  const prisma = GetPrismaClient.getClient();

  //일단은 미스키와 같은 Validate를 거침
  try {
    data = await validateStrict(loginReqDto, await req.json());
  } catch (err) {
    return sendApiError(400, `${err}`, 'BAD_REQUEST');
  }

  const limiter = RateLimiterService.getLimiter();
  const ipHash = getIpHash(getIpFromRequest(req));
  const limited = await limiter.limit(`mastodon-login-${ipHash}`, {
    bucket_time: 600,
    req_limit: 60,
  });
  if (limited) {
    return sendApiError(429, 'Rate Limited! Try Again Later', 'RATE_LIMITED');
  }

  const mastodonHost = data.host.toLowerCase();

  try {
    const serverInfo = await prisma.server.findFirst({
      where: {
        instances: mastodonHost,
      },
    });

    //인스턴스의 첫번째 로그인이거나, client_id/client_secret 가 null인 경우
    if (!serverInfo || !serverInfo.client_id || !serverInfo.client_secret) {
      const res = await fetch(`https://${mastodonHost}/api/v1/apps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_name: 'Neo-Quesdon',
          redirect_uris: `${process.env.WEB_URL}/mastodon-callback`,
          scopes: 'read:accounts read:blocks read:follows write:statuses',
          website: `${process.env.WEB_URL}`,
        }),
      }).then((r) => r.json());

      if (!res.id) {
        return sendApiError(500, `Mastodon Response: ${JSON.stringify(res)}`, 'MASTODON_ERROR');
      }
      logger.log('New Mastodon OAuth2 App Created:', res);

      await prisma.server.upsert({
        where: {
          instances: mastodonHost,
        },
        update: {
          client_id: res.client_id,
          client_secret: res.client_secret,
          instanceType: 'mastodon',
        },
        create: {
          instances: mastodonHost,
          client_id: res.client_id,
          client_secret: res.client_secret,
          instanceType: 'mastodon',
        },
      });
      const session = await initiateMastodonAuthSession(mastodonHost, res.client_id);
      return NextResponse.json(session);
    } else {
      const session = await initiateMastodonAuthSession(mastodonHost, serverInfo.client_id);
      return NextResponse.json(session);
    }
  } catch (err) {
    return sendApiError(500, `login error... ${err}`, 'SERVER_ERROR');
  }
}

/**
 *
 * @param hostname Mastodon Hostname
 * @param client_id OAuth2 Client ID
 * @returns Mastodon Authorize URL
 */
async function initiateMastodonAuthSession(hostname: string, client_id: string) {
  const loginState = `${randomUUID()}_${client_id}`;
  const redis = RedisService.getRedis();

  const params: { [key: string]: string } = {
    client_id: encodeURIComponent(client_id),
    scope: 'read:accounts+read:blocks+read:follows+write:statuses',
    redirect_uri: encodeURIComponent(`${process.env.WEB_URL}/mastodon-callback`),
    response_type: 'code',
    state: loginState,
  };

  const url = `https://${hostname}/oauth/authorize?${Object.entries(params)
    .map((v) => v.join('='))
    .join('&')}`;
  await redis.setex(`login/mastodon/${loginState}`, 90, `${loginState}`);
  logger.log('Created New Mastodon OAuth2 authorize URL:', url);
  return url;
}
