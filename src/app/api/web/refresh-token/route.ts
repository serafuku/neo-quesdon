import { RefreshTokenReqDto } from '@/app/_dto/refresh-token/refresh-token.dto';
import { Logger } from '@/utils/logger/Logger';
import { validateStrict } from '@/utils/validator/strictValidator';
import { NextRequest, NextResponse } from 'next/server';
import { sendApiError } from '@/api/_utils/apiErrorResponse/sendApiError';
import { verifyToken } from '@/api/_utils/jwt/verify-jwt';
import { cookies } from 'next/headers';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { profile, user } from '@prisma/client';
import { createHash } from 'crypto';
import { MiUser } from '@/api/_misskey-entities/user';
import { fetchNameWithEmoji } from '@/api/_utils/fetchUsername';
import { generateJwt } from '@/api/_utils/jwt/generate-jwt';
import { MastodonUser } from '@/api/_mastodon-entities/user';
import { RateLimiterService } from '@/_service/ratelimiter/rateLimiterService';
import { getIpFromRequest } from '@/api/_utils/getIp/get-ip-from-Request';
import { getIpHash } from '@/api/_utils/getIp/get-ip-hash';
import { QueueService } from '@/_service/queue/queueService';

const logger = new Logger('refresh-token');
export async function POST(req: NextRequest) {
  let data;
  try {
    data = await validateStrict(RefreshTokenReqDto, await req.json());
  } catch (err) {
    return sendApiError(400, `Bad Request! ${err}`, 'BAD_REQUEST');
  }
  const limiter = RateLimiterService.getLimiter();
  const ipHash = getIpHash(getIpFromRequest(req));
  const limited = await limiter.limit(`refresh-token-${ipHash}`, {
    bucket_time: 600,
    req_limit: 20,
  });
  if (limited) {
    return sendApiError(429, 'Rate Limited!', 'RATE_LIMITED');
  }
  const cookieStore = await cookies();
  let tokenPayload;
  try {
    tokenPayload = await verifyToken(cookieStore.get('jwtToken')?.value);
    if (tokenPayload.handle !== data.handle) {
      throw new Error('Handle not match with JWT');
    }
  } catch (err) {
    return sendApiError(401, `Auth Error! ${err}`, 'UNAUTHORIZED');
  }
  const prisma = GetPrismaClient.getClient();
  const user = await prisma.user.findUniqueOrThrow({ where: { handle: tokenPayload.handle } });

  try {
    logger.log('Try refresh JWT...');
    await refreshAndReValidateToken(user);
    const jwtToken = await generateJwt(user.hostName, user.handle, user.jwtIndex);
    cookieStore.set('jwtToken', jwtToken, {
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
    });
  } catch (err) {
    logger.warn('User Revoked Access token. JWT를 Revoke합니다... Detail:', err);
    await prisma.user.update({ where: { handle: user.handle }, data: { jwtIndex: user.jwtIndex + 1 } });
    return sendApiError(401, `Refresh user failed!! ${err}`, 'REMOTE_ACCESS_TOKEN_REVOKED');
  }

  return NextResponse.json({ message: '야호 JWT 갱신에 성공했어요!' }, { status: 200 });
}

/**
 * 유저의 정보를 인스턴스에서 다시 가져와서 프로필을 업데이트함.
 * 인스턴스에서 권한 문제로 실패한 경우 Throw.
 * @param user
 * @returns Promise<void>
 */
async function refreshAndReValidateToken(user: user): Promise<void> {
  const prisma = GetPrismaClient.getClient();
  const userServer = await prisma.server.findUniqueOrThrow({ where: { instances: user.hostName } });

  /** 테이블에 저장된 user의 Misskey / Mastodon access token */
  let userToken = user.token;
  if (userServer.instanceType === 'cherrypick' || userServer.instanceType === 'misskey') {
    /** Misskey/Cherrypick 인 경우는 저장된 access token을 i로 변환해야 함 */
    const i = createHash('sha256')
      .update(userToken + userServer.appSecret, 'utf-8')
      .digest('hex');
    userToken = i;
  }

  switch (userServer.instanceType) {
    case 'misskey':
    case 'cherrypick': {
      logger.debug('try to get user info from misskey...');
      let miUser: MiUser;
      try {
        const miResponse: MiUser | boolean = await fetchMisskeyUserInfo(userToken, user.hostName);
        if ((miResponse as boolean) === false) {
          //단순한 fetch 실패
          return;
        } else {
          miUser = miResponse as MiUser;
        }
      } catch (err) {
        logger.log('미스키 AUTHENTICATION_FAILED... ');
        //인증 실패의 경우 여기서 throw
        throw err;
      }

      try {
        const newNameWithEmoji = await fetchNameWithEmoji({
          name: miUser.name ?? miUser.username,
          baseUrl: user.hostName,
          emojis: null,
        });
        const updateProfile: Partial<profile> = {
          avatarUrl: miUser.avatarUrl ?? undefined,
          name: newNameWithEmoji,
        };
        const updateUser: Partial<user> = {
          name: newNameWithEmoji,
        };
        await updateDb(user.handle, updateUser, updateProfile);
      } catch {
        return;
      }
      const queueService = QueueService.get();
      await queueService.addRefreshFollowJob(user, 'misskey');
      logger.log(`Misskey User Updated!`);
      break;
    }
    case 'mastodon': {
      logger.debug('try to get User info from mastodon...');
      let mastodonUser;
      try {
        const ret = await fetchMastodonUserInfo(userToken, user.hostName);
        if ((ret as boolean) === false) {
          return;
        } else {
          mastodonUser = ret as MastodonUser;
        }
      } catch (err) {
        // 인증 실패의 경우 여기서 throw
        logger.log('마스토돈 AUTHENTICATION_FAILED... ');
        throw err;
      }
      try {
        const nameWithEmoji = await fetchNameWithEmoji({
          name: mastodonUser.display_name ?? mastodonUser.username,
          baseUrl: user.hostName,
          emojis: mastodonUser.emojis,
        });
        const profileUpdate: Partial<profile> = {
          name: nameWithEmoji,
          avatarUrl: mastodonUser.avatar ?? undefined,
        };
        const userUpdate: Partial<user> = {
          name: nameWithEmoji,
        };
        await updateDb(user.handle, userUpdate, profileUpdate);
      } catch {
        return;
      }
      const queueService = QueueService.get();
      await queueService.addRefreshFollowJob(user, 'mastodon');
      logger.log(`Mastodon User Updated!`);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * Misskey/Cherrypick 에서 유저 정보를 fetch
 * 미스키의 응답이 200 인 경우는 json을 반환, 401, 403인 경우는 throw
 * 401, 403 이 아닌 실패는 false 반환
 * @param i token
 * @param host Misskey host
 * @returns misskey API 'i' 에서 반환된 JSON, 또는 false
 * @throws Misskey에서 토큰 인증에 실패한 경우
 */
async function fetchMisskeyUserInfo(i: string, host: string): Promise<boolean | MiUser> {
  let res;
  try {
    res = await fetch(`https://${host}/api/i`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${i}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ i: i }),
    });
  } catch {
    logger.debug('미스키 i API 호출 실패');
    return false;
  }
  // i 토큰 인증이 실패한 경우
  if (res.status === 403 || res.status === 401) {
    logger.warn('Misskey returned AUTHENTICATION_FAILED');
    throw new Error(`Misskey AUTHENTICATION_FAILED ${await res.text()}`);
  }
  // 기타 오류
  else if (!res.ok) {
    logger.debug('미스키 i API 호출 실패');
    return false;
  }
  // MiUser 를 받은 경우
  else {
    return await res.json();
  }
}

/**
 * Mastodon 에서 유저 정보를 fetch 후 반환.
 * Mastodon 응답이 200인 경우 json 반환, 인증 실패시 throw, 단순 오류시 false 반환
 * @param i token
 * @param host Misskey host
 * @returns  Mastodon 응답이 200인 경우 json 반환, 권한이 아닌 이유로 실패시 false반환
 * @throws Mastodon 토큰 인증 실패시 throw
 */
async function fetchMastodonUserInfo(token: string, host: string): Promise<boolean | MastodonUser> {
  let res;
  try {
    res = await fetch(`https://${host}/api/v1/accounts/verify_credentials`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-type': 'application/json' },
    });
  } catch {
    // 네트워크 등의 이유로 fetch 자체가 실패한 경우
    logger.debug('마스토톤 API fetch 실패');
    return false;
  }
  // 마스토돈에서 토큰을 거부한 경우
  if (res.status === 401 || res.status === 403) {
    throw new Error(`Error! ${await res.text()}`);
  }
  // 기타 오류
  else if (!res.ok) {
    logger.debug('마스토돈 verify_credentials API 호출 실패');
    return false;
  } else {
    // 설마 200에 json이 아닌 응답을 주겠어?
    return await res.json();
  }
}

/**
 * user, Profile 테이블 업데이트
 * @param params
 */
async function updateDb(targetUserHandle: string, updateUser: Partial<user>, updateProfile: Partial<profile>) {
  const prisma = GetPrismaClient.getClient();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { handle: targetUserHandle }, data: updateUser });
    await tx.profile.update({ where: { handle: targetUserHandle }, data: updateProfile });
  });
}
