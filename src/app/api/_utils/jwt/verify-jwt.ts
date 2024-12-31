'use server';

import { jwtVerify } from 'jose';
import { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { validate, ValidatorOptions } from 'class-validator';
import { plainToInstance } from 'class-transformer';

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
    const data = plainToInstance(jwtPayloadType, payload, { excludeExtraneousValues: true });
    const errors = await validate(data, { whitelist: true, forbidNonWhitelisted: true } as ValidatorOptions);
    if (errors.length > 0) {
      logger.debug('JWT payload error', errors);
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
