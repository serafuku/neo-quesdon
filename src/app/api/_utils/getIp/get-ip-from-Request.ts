import { Logger } from '@/utils/logger/Logger';
import { IncomingMessage } from 'http';
import { NextRequest } from 'next/server';
import { Address4, Address6 } from 'ip-address';

const logger = new Logger('get-ip-from-request');

/**
 * X-Forwarded-For 해석 모드.
 * - false (기본): 좌측값 사용 (XFF 를 overwrite 하는 프록시 구성 / 직접 노출 호환, 기존 동작 유지)
 * - true: 우측값 사용 (프록시가 기존 XFF 뒤에 실제 클라이언트 IP 를 append 하는
 *   `proxy_add_x_forwarded_for` 계열 구성에서 스푸핑 방지)
 */
const USE_RIGHTMOST_XFF = ['true', '1', 'yes'].includes((process.env.TRUST_PROXY ?? '').toLowerCase());

function isValidIp(value: string): boolean {
  try {
    new Address4(value);
    return true;
  } catch {
    // IPv4 가 아니면 IPv6 로 시도
  }
  try {
    new Address6(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * X-Forwarded-For 헤더 값에서 신뢰 구성에 맞는 클라이언트 IP 를 추출한다.
 * 빈 항목이나 IP 형식이 아닌 항목은 건너뛴다. (빈 문자열이 getIpHash 로 흘러가는 것 방지)
 */
function extractFromXff(headerValue: string | string[] | null | undefined): string | undefined {
  const header = Array.isArray(headerValue) ? headerValue.join(',') : headerValue;
  if (typeof header !== 'string') {
    return undefined;
  }
  const entries = header
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  if (entries.length === 0) {
    return undefined;
  }
  const candidates = USE_RIGHTMOST_XFF ? [...entries].reverse() : entries;
  for (const candidate of candidates) {
    if (isValidIp(candidate)) {
      return candidate;
    }
  }
  logger.debug(`X-Forwarded-For 에 유효한 IP 가 없음: ${headerValue}`);
  return undefined;
}

export function getIpFromIncomingMessage(req: IncomingMessage) {
  const fromXff = extractFromXff(req.headers['x-forwarded-for']);
  if (fromXff) {
    return fromXff;
  }
  // XFF 를 신뢰할 수 없는 경우 소켓의 실제 peer 주소를 사용한다.
  return req.socket.remoteAddress ?? '127.0.0.1';
}

export function getIpFromRequest(req: NextRequest) {
  const fromXff = extractFromXff(req.headers.get('x-forwarded-for'));
  if (fromXff) {
    return fromXff;
  }
  // NextRequest 에는 소켓 주소에 접근할 방법이 없어 XFF 로만 판별 가능하다.
  return '127.0.0.1';
}
