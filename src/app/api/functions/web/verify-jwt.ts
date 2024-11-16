"use server";

import { jwtVerify } from "jose";

type jwtPayload = {
  handle: string;
  server: string;
};

/**
 * JWT 를 검증하고, 디코딩된 JWT의 페이로드를 반환
 * @param token JWT
 * @returns JWT payload
 * @throws JWT validation error
 */
export async function verifyToken(token: string | null | undefined) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  try {
    if (typeof token !== "string") {
      throw new Error("token is not string");
    }
    const { payload } = await jwtVerify(token, secret);
    const data: jwtPayload = {
      handle: "",
      server: "",
    };
    if (
      typeof payload.handle === "string" &&
      typeof payload.server === "string"
    ) {
      data.handle = payload.handle;
      data.server = payload.server;
    } else {
      throw new Error("JWT payload error");
    }
    return data;
  } catch (err) {
    throw new Error(`token not verified: ${err}`);
  }
}
