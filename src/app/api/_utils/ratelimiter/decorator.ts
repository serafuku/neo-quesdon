/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { NextRequest } from 'next/server';
import { sendApiError } from '../apiErrorResponse/sendApiError';
import { getIpFromRequest } from '../getIp/get-ip-from-Request';
import { getIpHash } from '../getIp/get-ip-hash';
import { RateLimiterService } from './rateLimiter';
import { verifyToken } from '../jwt/verify-jwt';

export function RateLimit(limitOptions: { bucket_time: number; req_limit: number }, type: 'ip' | 'user') {
  return function (target: unknown, name: string, descriptor: PropertyDescriptor) {
    const originMethod = descriptor.value as Function;

    descriptor.value = async function (...args: unknown[]) {
      const req = args[0] as NextRequest;
      const token = req.cookies.get('jwtToken')?.value;
      const subkey = type === 'ip' ? getIpHash(getIpFromRequest(req)) : (await verifyToken(token)).handle;
      const limit_key = `${name}:` + subkey;
      const limiter = RateLimiterService.getLimiter();
      const isLimited = await limiter.limit(limit_key, limitOptions);
      if (isLimited) {
        return sendApiError(429, 'Rate Limit. 요청 한도를 초과했습니다. 잠시후 다시 시도해 주세요. ');
      }
      return await originMethod.apply(this, args);
    };
  };
}
