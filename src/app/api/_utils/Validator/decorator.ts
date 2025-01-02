/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { NextRequest } from 'next/server';
import { sendApiError } from '@/api/_utils/apiErrorResponse/sendApiError';
import 'reflect-metadata';
import { validateStrict } from '@/utils/validator/strictValidator';
import { ClassConstructor } from 'class-transformer';

/**
 * @param cls 원하는 Dto Class
 */
export function ValidateBody(cls: ClassConstructor<any>) {
  return function (target: any, methodName: string, descriptor: PropertyDescriptor) {
    const originMethod = descriptor.value as Function;
    descriptor.value = async function (...args: unknown[]) {
      const req = args[0] as NextRequest;

      // 메타데이터에서 인자 위치 추출
      const targetIndex = Reflect.getMetadata('validated_body_target', target, methodName);
      if (!targetIndex) {
        throw new Error('HTTP Body targetIndex 찾을 수 없음');
      }
      let body;
      try {
        body = await req.json();
      } catch (err) {
        return sendApiError(400, String(err), 'BAD_REQUEST');
      }

      let validatedBody;
      try {
        validatedBody = await validateStrict(cls, body);
      } catch (err) {
        return sendApiError(400, String(err), 'BAD_REQUEST');
      }
      args[targetIndex] = validatedBody;

      return await originMethod.apply(this, args);
    };
  };
}

export function Body(target: any, name: string, index: number) {
  // Validate를 통과한 Body를 넣어 줘야할 매개변수의 인덱스 정보를 메타데이터로 저장
  Reflect.defineMetadata('validated_body_target', index, target, name);
}
