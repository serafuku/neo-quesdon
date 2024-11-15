"use server";

import { PrismaClient } from "@prisma/client";
import { DBpayload } from "./page";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { tokenPayload } from "..";

export async function requestAccessToken(payload: tokenPayload) {
  const prisma = new PrismaClient();

  const checkInstances = await prisma.server.findFirst({
    where: {
      instances: payload.address,
    },
  });

  if (checkInstances) {
    const accessToken = await fetch(
      `https://${payload.address}/api/auth/session/userkey`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appSecret: checkInstances.appSecret,
          token: payload.token,
        }),
      }
    ).then((r) => r.json());

    return accessToken;
  } else {
    return null;
  }
}

export async function generateJwt(payload: DBpayload) {
  const cookieStore = await cookies();

  const alg = "HS256";
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  const webUrl = process.env.WEB_URL;
  const jwtToken = await new SignJWT({
    server: payload.hostName,
    handle: `@${payload.account}@${payload.hostName}`,
  })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setIssuer(`${webUrl}`)
    .setAudience("urn:example:audience")
    .setExpirationTime("2h")
    .sign(secret);

  cookieStore.set("jwtToken", jwtToken, {
    expires: Date.now() + 1000 * 60 * 60 * 2,
    httpOnly: true,
  });
  cookieStore.set("server", payload.hostName, {
    expires: Date.now() + 1000 * 60 * 60 * 2,
    httpOnly: true,
  });
}

export async function pushDB(payload: DBpayload) {
  const prisma = new PrismaClient();

  const pushUser = await prisma.user.upsert({
    where: {
      handle: payload.handle,
    },
    update: {
      token: payload.accessToken,
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
