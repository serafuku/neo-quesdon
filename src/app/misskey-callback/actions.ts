"use server";

import { PrismaClient } from "@prisma/client";
import { DBpayload } from "./page";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { callbackTokenClaimPayload, misskeyAccessKeyApiResponse, userInfoPayload } from "..";
import { MiUser } from "../api/misskey-entities/user";
import { fetchNameWithEmoji } from "../api/functions/web/fetchUsername";


export async function login(loginReq: callbackTokenClaimPayload): Promise<userInfoPayload> {

  // 미스키 App 인증 API에서 액세스토큰과 MiUser 정보를 받아오기
  const misskeyApiResponse: misskeyAccessKeyApiResponse = await requestMiAccessTokenAndUserInfo(loginReq);
  if (misskeyApiResponse === null) {
    throw new Error(`misskey token get fail!`);
  }

  const user: MiUser = misskeyApiResponse.user;
  const miAccessToken = misskeyApiResponse.accessToken;
  if (typeof user !== 'object' || typeof miAccessToken !== 'string') {
    throw new Error(`fail to get Misskey User/Token`);
  }

  const user_handle = `@${user.username}@${loginReq.misskeyHost}`;

  let nameWithEmoji = await fetchNameWithEmoji({
    name: user.name ?? user.username,
    misskeyBaseUrl: `https://${loginReq.misskeyHost}`,
  });
  
  if (nameWithEmoji.length === 0) {
    nameWithEmoji = [`${user.username}`];
  }

  // DB 에 로그인 유저 정보 저장
  const dbPayload: DBpayload = {
    account: user.username,
    accountLower: user.username.toLowerCase(),
    hostName: loginReq.misskeyHost,
    handle: user_handle,
    name: nameWithEmoji,
    avatarUrl: user.avatarUrl ?? '',
    accessToken: miAccessToken,
    userId: user.id,
  };
  try {
    await pushDB(dbPayload);
  } catch(err) {
    console.error(`Fail to push user to DB`, err);
    throw err;
  }

  try {
    // 프론트 쿠키스토어에 쿠키 저장
    const cookieStore = await cookies();
    const jwtToken = await generateJwt(loginReq.misskeyHost, user_handle);
    console.log(`Send JWT to Frontend... ${jwtToken}`);
    cookieStore.set("jwtToken", jwtToken, {
      expires: Date.now() + 1000 * 60 * 60 * 6,
      httpOnly: true,
    });
    cookieStore.set("server", loginReq.misskeyHost, {
      expires: Date.now() + 1000 * 60 * 60 * 6,
      httpOnly: true,
    });
  } catch (err) {
    console.error(`Make JWT or Set cookie failed!`, err);
    throw err;
  }


  //유저 정보 프론트로 반환
  return { user: user };
}


/**
 * 미스키에서 유저가 권한을 승인한 후, 콜백으로 받은 (App인증 방식) 토큰을 사용해서 
 * 미스키에서 accessToken과 유저 정보를 받아옴. 
 *  참고: https://misskey-hub.net/ko/docs/for-developers/api/token/app/
 * 인증 성공시 미스키의 /api/auth/session/userkey 응답 바디를 반환, 실패시 null 반환. 
 * @param payload callbackTokenClaimPayload
 * @returns misskey appAuth API response body, or null when failed
 */
async function requestMiAccessTokenAndUserInfo(payload: callbackTokenClaimPayload) {
  const prisma = new PrismaClient();

  const checkInstances = await prisma.server.findFirst({
    where: {
      instances: payload.misskeyHost,
    },
  });

  if (checkInstances) {
    const res = await fetch(
      `https://${payload.misskeyHost}/api/auth/session/userkey`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appSecret: checkInstances.appSecret,
          token: payload.callback_token,
        }),
      }
    );
    if (res.ok) {
      const resBody = await res.json();
      return resBody;
    } else {
      console.error(`Fail to get Misskey Access token`, res.status, res.statusText);
      return null;
    }
  } else {
    return null;
  }
}


async function generateJwt(hostname: string, handle: string) {
  const alg = "HS256";
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  const webUrl = process.env.WEB_URL;
  const jwtToken = await new SignJWT({
    server: hostname,
    handle: handle,
  })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setIssuer(`${webUrl}`)
    .setAudience("urn:example:audience")
    .setExpirationTime("6h")
    .sign(secret);
  return jwtToken;
}

async function pushDB(payload: DBpayload) {
  const prisma = new PrismaClient();
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
