"use server";

import { jwtVerify, JWTVerifyResult } from "jose";

export async function authJwtToken(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  try {
    const { payload } = (await jwtVerify(token, secret, {
      issuer: "urn:example:issuer",
      audience: "urn:example:audience",
    })) as JWTVerifyResult<{ handle: string; server: string }>;

    return payload;
  } catch (err) {
    throw new Error(`token not verified: ${err}`);
  }
}
