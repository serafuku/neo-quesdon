'use server';

import { SignJWT } from 'jose';
import { jwtPayload } from './jwtPayload';

export async function generateJwt(hostname: string, handle: string, jwtIndex: number) {
  const alg = 'HS256';
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const jwtPayload: jwtPayload = {
    server: hostname,
    handle: handle,
    jwtIndex: jwtIndex,
  };

  const webUrl = process.env.WEB_URL;
  const jwtToken = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setIssuer(`${webUrl}`)
    .setAudience('urn:example:audience')
    .setExpirationTime('7d')
    .sign(secret);
  return jwtToken;
}
