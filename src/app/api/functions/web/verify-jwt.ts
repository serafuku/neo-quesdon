"use server";

import { jwtVerify, JWTVerifyResult } from "jose";

type jwtPayload = {
  handle: string;
  server: string;
}

/**
 * JWT 를 검증하고, 디코딩된 JWT의 페이로드를 반환
 * @param token JWT
 * @returns JWT payload
 * @throws JWT validation error
 */
export async function verifyToken(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  try {
    const { payload } = (await jwtVerify(token, secret));
    const data: jwtPayload  = {
      handle: "",
      server: ""
    }
    if (typeof payload.handle === 'string' && typeof payload.server === 'string') {
      data.handle = payload.handle;
      data.server = payload.server;
    } else {
      throw new Error('JWT payload error');
    }
    return data;
  } catch (err) {
    throw new Error(`token not verified: ${err}`);
  }
}
