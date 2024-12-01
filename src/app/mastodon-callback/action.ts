'use server';

import { validateStrict } from '@/utils/validator/strictValidator';
import { mastodonCallbackTokenClaimPayload } from '@/app/_dto/mastodon-callback/callback-token-claim.dto';
import { fetchNameWithEmoji } from '@/api/_utils/fetchUsername';
import { cookies } from 'next/headers';
import { generateJwt } from '@/api/_utils/jwt/generate-jwt';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { DBpayload } from '..';

const logger = new Logger('Mastodon-callback');
export async function login(loginReqestData: mastodonCallbackTokenClaimPayload) {
  const prisma = GetPrismaClient.getClient();

  //Class Validator로 들어온 로그인 정보 검증
  let loginReq: mastodonCallbackTokenClaimPayload;
  try {
    loginReq = await validateStrict(mastodonCallbackTokenClaimPayload, loginReqestData);
  } catch (err) {
    throw new Error(JSON.stringify(err));
  }
  loginReq.mastodonHost = loginReq.mastodonHost.toLowerCase();

  const serverInfo = await prisma.server.findFirst({
    where: {
      instances: loginReq.mastodonHost,
    },
  });

  if (serverInfo?.client_id && serverInfo?.client_secret) {
    const mastodonApiResponse = await requestMastodonAccessCodeAndUserInfo(
      loginReq,
      serverInfo.client_id,
      serverInfo.client_secret,
    );

    const user_handle = `@${mastodonApiResponse.profile.username}@${loginReq.mastodonHost}`;

    let nameWithEmoji = await fetchNameWithEmoji({
      name: mastodonApiResponse.profile.display_name ?? mastodonApiResponse.profile.username,
      baseUrl: loginReq.mastodonHost,
      emojis: mastodonApiResponse.profile.emojis,
    });

    if (nameWithEmoji.length === 0) {
      nameWithEmoji = [`${mastodonApiResponse.profile.username}`];
    }

    const dbPayload: DBpayload = {
      account: mastodonApiResponse.profile.username,
      accountLower: mastodonApiResponse.profile.username.toLowerCase(),
      hostName: loginReq.mastodonHost,
      handle: user_handle,
      name: nameWithEmoji,
      avatarUrl: mastodonApiResponse.profile.avatar ?? '',
      accessToken: mastodonApiResponse.token,
      userId: mastodonApiResponse.profile.id,
    };

    try {
      await pushDB(dbPayload);
    } catch (err) {
      logger.error('Fail to push user to DB', err);
      throw err;
    }

    try {
      //프론트 쿠키스토어에 쿠키 저장
      const cookieStore = await cookies();
      const prisma = GetPrismaClient.getClient();
      const user = await prisma.user.findUniqueOrThrow({ where: { handle: user_handle } });
      const jwtToken = await generateJwt(loginReq.mastodonHost, user_handle, user.jwtIndex);
      cookieStore.set('jwtToken', jwtToken, {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
      });
      cookieStore.set('server', loginReq.mastodonHost, {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
      });
    } catch (err) {
      logger.error('Make JWT or Set cookie Failed! ', err);
      throw err;
    }

    return { user: mastodonApiResponse };
  } else {
    throw new Error('there is no server');
  }
}

/**
 * 마스토돈에서 유저 Token을 요청하는 함수
 * @param payload
 */
async function requestMastodonAccessCodeAndUserInfo(
  payload: mastodonCallbackTokenClaimPayload,
  client_id: string,
  client_secret: string,
) {
  const prisma = GetPrismaClient.getClient();

  const checkInstances = await prisma.server.findFirst({
    where: {
      instances: payload.mastodonHost,
    },
  });

  if (checkInstances) {
    try {
      const res_token = await fetch(`https://${payload.mastodonHost}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          redirect_uri: `${process.env.WEB_URL}/mastodon-callback`,
          client_id: client_id,
          client_secret: client_secret,
          code: payload.callback_code,
          state: payload.state,
        }),
      });
      if (!res_token.ok) {
        logger.warn('Mastodon Login Fail!. Mastodon Response: ', await res_token.text());
        throw new Error('Mastodon Login Fail!');
      }
      const tokenResponse = await res_token.json();

      const res_verify = await fetch(`https://${payload.mastodonHost}/api/v1/accounts/verify_credentials`, {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      if (!res_token.ok) {
        logger.warn('Mastodon Login Fail(token Verify). Mastodon Response: ', await res_verify.text());
        throw new Error('Mastodon Login Fail!');
      }
      const myProfile = await res_verify.json();

      return { profile: myProfile, token: tokenResponse.access_token };
    } catch (err) {
      throw err;
    }
  } else {
    throw new Error('there is no instances');
  }
}

async function pushDB(payload: DBpayload) {
  const prisma = GetPrismaClient.getClient();

  await prisma.user.upsert({
    where: {
      handle: payload.handle,
    },
    update: {
      name: payload.name,
      token: payload.accessToken,
      profile: {
        update: {
          account: payload.account,
          avatarUrl: payload.avatarUrl,
          name: payload.name,
        },
      },
    },
    create: {
      account: payload.account,
      accountLower: payload.accountLower,
      hostName: payload.hostName,
      handle: payload.handle,
      name: payload.name,
      token: payload.accessToken,
      userId: payload.userId,
      profile: {
        create: {
          account: payload.account,
          avatarUrl: payload.avatarUrl,
          name: payload.name,
        },
      },
    },
  });
}
