/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { NextRequest } from 'next/server';
import { sendApiError } from '../apiErrorResponse/sendApiError';
import { verifyToken } from './verify-jwt';
import 'reflect-metadata';
import { Logger } from '@/utils/logger/Logger';

export function Auth() {
  return function (target: unknown, methodName: string, descriptor: PropertyDescriptor) {
    const originMethod = descriptor.value as Function;
    const __logger = new Logger(methodName);
    descriptor.value = async function (...args: unknown[]) {
      const req = args[0] as NextRequest;
      const jwt = req.cookies.get('jwtToken')?.value;
      let jwtBody;
      try {
        jwtBody = await verifyToken(jwt);
      } catch {
        return sendApiError(401, 'Auth Error');
      }

      // 메타데이터에서 인자 위치 추출
      const targetIndex = Reflect.getMetadata('jwt_body_target', originMethod);
      args[targetIndex] = jwtBody;
      __logger.debug(`${jwtBody.handle} Call method '${methodName}'`)
      return await originMethod.apply(this, args);
    };
  };
}

export function JwtPayload(target: any, name: string, index: number) {
  // JWT 페이로드를 넣어 줘야할 매개변수의 인덱스 정보를 메타데이터로 저장
  Reflect.defineMetadata('jwt_body_target', index, target[name]);
}
