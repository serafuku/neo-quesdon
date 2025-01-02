/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { NextRequest } from 'next/server';
import { sendApiError } from '@/api/_utils/apiErrorResponse/sendApiError';
import { verifyToken } from '@/api/_utils/jwt/verify-jwt';
import 'reflect-metadata';
import { Logger } from '@/utils/logger/Logger';
import { TokenValidteError } from '@/app/api/_utils/jwt/ValidationErrorType';

export function Auth(options?: { isOptional: boolean }) {
  return function (target: any, methodName: string, descriptor: PropertyDescriptor) {
    const originMethod = descriptor.value as Function;
    const __logger = new Logger(methodName);
    descriptor.value = async function (...args: unknown[]) {
      const req = args[0] as NextRequest;
      const jwt = req.cookies.get('jwtToken')?.value;
      let jwtBody;
      if (jwt) {
        try {
          jwtBody = await verifyToken(jwt);
        } catch (err) {
          const e = err as TokenValidteError;

          switch (e.code) {
            case 'JWT_PAYLOAD_ERROR':
            case 'JWS_INVALID': {
              // 토큰의 형식 자체가 잘못된 경우는 400 응답
              return sendApiError(400, `Error: invalid JWT ${e.code}`, 'BAD_REQUEST');
            }
            case 'JWT_EXPIRED':
            case 'JWT_REVOKED': {
              const apiErrorType = e.code;
              return sendApiError(401, `Auth Error: ${e.code}`, apiErrorType);
            }
            default: {
              const apiErrorType = 'UNAUTHORIZED';
              return sendApiError(401, `Auth Error: ${e.code}`, apiErrorType);
            }
          }
        }
      } else if (options?.isOptional !== true) {
        return sendApiError(401, 'Auth Error: No Auth Token', 'UNAUTHORIZED');
      }

      // 메타데이터에서 인자 위치 추출
      const targetIndex = Reflect.getMetadata('jwt_body_target', target, methodName);
      if (!targetIndex) {
        throw new Error('JWT Body targetIndex 찾을 수 없음');
      }
      args[targetIndex] = jwtBody;
      __logger.debug(`${jwtBody?.handle ?? '익명'} Call method '${methodName}'`);
      return await originMethod.apply(this, args);
    };
  };
}

export function JwtPayload(target: any, name: string, index: number) {
  // JWT 페이로드를 넣어 줘야할 매개변수의 인덱스 정보를 메타데이터로 저장
  Reflect.defineMetadata('jwt_body_target', index, target, name);
}
