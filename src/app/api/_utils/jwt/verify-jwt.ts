'use server';

import { jwtVerify } from 'jose';
import { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { validate, ValidatorOptions } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { JOSEError } from 'jose/dist/types/util/errors';
import { TokenValidteError } from '@/app/api/_utils/jwt/ValidationErrorType';

const logger = new Logger('verifyToken');

/**
 * JWT 를 검증하고, 디코딩된 JWT의 페이로드를 반환
 * @param token JWT
 * @returns JWT payload
 * @throws TokenValidteError
 */
export async function verifyToken(token: string | null | undefined) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const prisma = GetPrismaClient.getClient();

  if (typeof token !== 'string') {
    throw new Error('token is not string');
  }
  let payload;
  try {
    payload = (await jwtVerify(token, secret)).payload;
  } catch (err) {
    const joseError = err as JOSEError;
    logger.debug(`token Validate error ${joseError.code}`);
    switch (joseError.code) {
      case 'ERR_JWT_EXPIRED':
        throw new TokenValidteError('JWT_EXPIRED');
      case 'ERR_JWT_INVALID':
        throw new TokenValidteError('JWT_INVALID');
      case 'ERR_JWS_INVALID':
        throw new TokenValidteError('JWS_INVALID');
      case 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED':
        throw new TokenValidteError('JWS_SIGNATURE_VERIFICATION_FAILED');
      default:
        throw new TokenValidteError('UNKNOWN_ERROR');
    }
  }
  try {
    const data = plainToInstance(jwtPayloadType, payload, { excludeExtraneousValues: true });
    const errors = await validate(data, { whitelist: true, forbidNonWhitelisted: true } as ValidatorOptions);
    if (errors.length > 0) {
      throw new TokenValidteError('JWT_PAYLOAD_ERROR');
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { handle: data.handle } });
    if (user.jwtIndex !== data.jwtIndex) {
      logger.debug('This token is revoked');
      throw new TokenValidteError('JWT_REVOKED');
    }
    return data;
  } catch (err) {
    logger.debug(`token not verified: ${err}`);
    throw err;
  }
}
