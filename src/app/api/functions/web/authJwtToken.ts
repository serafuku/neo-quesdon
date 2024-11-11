"use server";

import { jwtVerify } from "jose";

export async function authJwtToken(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: "urn:example:issuer",
      audience: "urn:example:audience",
    });

    return payload;
  } catch (err) {
    throw new Error(`token not verified: ${err}`);
  }
}
