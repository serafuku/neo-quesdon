/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { NextRequest } from 'next/server';
import { sendApiError } from '@/api/_utils/apiErrorResponse/sendApiError';
import { getIpFromRequest } from '@/api/_utils/getIp/get-ip-from-Request';
import { getIpHash } from '@/api/_utils/getIp/get-ip-hash';
import { RateLimiterService } from '@/_service/ratelimiter/rateLimiterService';
import { verifyToken } from '@/api/_utils/jwt/verify-jwt';

export function RateLimit(
  limitOptions: { bucket_time: number; req_limit: number },
  type: 'ip' | 'user' | 'user-or-ip',
) {
  return function (target: unknown, name: string, descriptor: PropertyDescriptor) {
    const originMethod = descriptor.value as Function;

    descriptor.value = async function (...args: unknown[]) {
      const req = args[0] as NextRequest;
      const key_postfix = async () => {
        const token = req.cookies.get('jwtToken')?.value;
        switch (type) {
          case 'ip':
            return getIpHash(getIpFromRequest(req));
          case 'user':
            return (await verifyToken(token)).handle;
          case 'user-or-ip':
            try {
              return (await verifyToken(token)).handle;
            } catch {
              return getIpHash(getIpFromRequest(req));
            }
        }
      };
      const limit_key = `${name}:` + (await key_postfix());
      const limiter = RateLimiterService.getLimiter();
      const isLimited = await limiter.limit(limit_key, limitOptions);
      if (isLimited) {
        return sendApiError(429, 'Rate Limited! Try Again Later', 'RATE_LIMITED');
      }
      return await originMethod.apply(this, args);
    };
  };
}
