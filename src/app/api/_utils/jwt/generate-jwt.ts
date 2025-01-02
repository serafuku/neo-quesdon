'use server';

import { SignJWT } from 'jose';
import { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { Logger } from '@/utils/logger/Logger';

const logger = new Logger('generateJwt');
export async function generateJwt(hostname: string, handle: string, jwtIndex: number) {
  const alg = 'HS256';
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const jwtPayload: jwtPayloadType = {
    server: hostname,
    handle: handle,
    jwtIndex: jwtIndex,
  };

  const webUrl = process.env.WEB_URL;
  const jwtToken = await new SignJWT({ ...jwtPayload })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setIssuer(`${webUrl}`)
    .setAudience('urn:example:audience')
    .setExpirationTime('7d')
    .sign(secret);
  logger.log(`Make new JWT: ${JSON.stringify(jwtPayload)}`);
  return jwtToken;
}
