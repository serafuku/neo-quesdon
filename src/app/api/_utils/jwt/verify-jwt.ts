'use server';

import { jwtVerify } from 'jose';
import { jwtPayload } from './jwtPayload';
import { GetPrismaClient } from '../getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';

const logger = new Logger('verifyToken');
/**
 * JWT 를 검증하고, 디코딩된 JWT의 페이로드를 반환
 * @param token JWT
 * @returns JWT payload
 * @throws JWT validation error
 */
export async function verifyToken(token: string | null | undefined) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const prisma = GetPrismaClient.getClient();

  try {
    if (typeof token !== 'string') {
      throw new Error('token is not string');
    }
    const { payload } = await jwtVerify(token, secret);
    const data: jwtPayload = {
      handle: '',
      server: '',
      jwtIndex: 0,
    };
    if (
      typeof payload.handle === 'string' &&
      typeof payload.server === 'string' &&
      typeof payload.jwtIndex === 'number'
    ) {
      data.handle = payload.handle;
      data.server = payload.server;
      data.jwtIndex = payload.jwtIndex;
    } else {
      logger.debug('JWT payload error');
      throw new Error('JWT payload error');
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { handle: data.handle } });
    if (user.jwtIndex !== data.jwtIndex) {
      logger.debug('This token is revoked');
      throw new Error('This token is revoked');
    }
    return data;
  } catch (err) {
    logger.debug(`token not verified: ${err}`);
    throw new Error(`token not verified: ${err}`);
  }
}
