import { RateLimit } from '@/app/api/_service/ratelimiter/decorator';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { isFQDN, isNumberString } from 'class-validator';
import { NextRequest, NextResponse } from 'next/server';
import { Address4, Address6 } from 'ip-address';
import dns from 'dns';
import RE2 from 're2';
import axios from 'axios';
import { Logger } from '@/utils/logger/Logger';

// 리다이렉션을 따라갈 수 있는 최대 횟수
const MAX_REDIRECTS = 5;
// 리다이렉션 포함 전체 요청의 시간 예산
const TOTAL_REQUEST_BUDGET_MS = 30_000;
const V4_LITERAL_REGEX = /^\d{1,3}(?:\.\d{1,3}){3}$/;

type ValidatedAddress = { address: string; family: 4 | 6 };

// 차단할 특수목적 대역 (IANA Special-Purpose Address Registry 기반, IPv4)
const BLOCKED_V4_SUBNETS = [
  '0.0.0.0/8', // "this network"
  '10.0.0.0/8', // private
  '100.64.0.0/10', // CGNAT
  '127.0.0.0/8', // loopback
  '169.254.0.0/16', // link-local
  '172.16.0.0/12', // private
  '192.0.0.0/24', // IETF protocol assignments
  '192.0.2.0/24', // TEST-NET-1
  '192.88.99.0/24', // 6to4 relay anycast
  '192.168.0.0/16', // private
  '198.18.0.0/15', // benchmarking
  '198.51.100.0/24', // TEST-NET-2
  '203.0.113.0/24', // TEST-NET-3
  '224.0.0.0/4', // multicast
  '240.0.0.0/4', // reserved (broadcast 포함)
].map((s) => new Address4(s));

// 차단할 특수목적 대역 (IANA Special-Purpose Address Registry 기반, IPv6)
const BLOCKED_V6_SUBNETS = [
  '::/128', // unspecified
  '::1/128', // loopback
  '::/96', // deprecated IPv4-compatible
  '::ffff:0:0/96', // IPv4-mapped
  '64:ff9b::/96', // NAT64 well-known prefix
  '100::/64', // discard
  '2001:db8::/32', // documentation
  '2002::/16', // 6to4 (내장 IPv4 검증 없이 전체 차단)
  'fc00::/7', // unique local
  'fe80::/10', // link-local
  'ff00::/8', // multicast
].map((s) => new Address6(s));

class RemoteResolutionError extends Error {}

function isBlockedAddress(address: Address4 | Address6): boolean {
  const subnets = address instanceof Address4 ? BLOCKED_V4_SUBNETS : BLOCKED_V6_SUBNETS;
  return subnets.some((subnet) => address.isHostInSubnet(subnet));
}

/**
 * URL 의 hostname 을 조회하고, 공개 주소만 필터링하여 반환한다.
 * - DNS 조회 결과 전체(IPv4/IPv6)를 대상으로 검증한다.
 * - IP 리터럴(리다이렉션 Location)도 검증한다.
 * @throws RemoteResolutionError DNS 조회 실패 또는 공개 주소가 없는 경우
 */
async function resolveValidatedAddresses(url: URL): Promise<ValidatedAddress[]> {
  const hostname = url.hostname.replace(/^\[/, '').replace(/\]$/, '');
  let entries: { address: string; family: number }[];
  try {
    if (V4_LITERAL_REGEX.test(hostname)) {
      entries = [{ address: new Address4(hostname).correctForm(), family: 4 }];
    } else if (hostname.includes(':')) {
      entries = [{ address: new Address6(hostname).correctForm(), family: 6 }];
    } else {
      entries = await dns.promises.lookup(hostname, { all: true });
    }
  } catch (err) {
    throw new RemoteResolutionError(`Failed to resolve ${hostname} (${String(err)})`);
  }
  const validated = entries.flatMap((entry): ValidatedAddress[] => {
    const address = entry.family === 4 ? new Address4(entry.address) : new Address6(entry.address);
    if (!address.isCorrect() || isBlockedAddress(address)) {
      return [];
    }
    return [{ address: address.correctForm(), family: entry.family === 4 ? 4 : 6 }];
  });
  if (validated.length === 0) {
    throw new RemoteResolutionError('Proxy to private network not allowed');
  }
  return validated;
}

export async function GET(req: NextRequest) {
  return RemoteImageProxy.imageProxy(req);
}

class RemoteImageProxy {
  private static logger = new Logger('RemoteImageProxy');
  @RateLimit({ bucket_time: 600, req_limit: 600 }, 'ip')
  public static async imageProxy(req: NextRequest): Promise<NextResponse | Response> {
    const REMOTE_MEDIA_SIZE_LIMIT = 31457280;
    const urlParam = req.nextUrl.searchParams.get('url');

    if (urlParam) {
      const abortController = new AbortController();
      try {
        let url: URL;
        try {
          url = new URL(urlParam);
          if (!isFQDN(url.hostname)) {
            return sendApiError(400, 'URL hostname is not FQDN', 'BAD_REQUEST');
          }
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return sendApiError(400, 'protocol is not http/https', 'BAD_REQUEST');
          }
        } catch (err) {
          const res = sendApiError(400, `${String(err)}`, 'BAD_REQUEST');
          res.headers.set('Cache-Control', 'public, max-age=3600');
          return res;
        }
        let remote_res;
        const deadline = Date.now() + TOTAL_REQUEST_BUDGET_MS;
        try {
          // 리다이렉션을 직접 처리한다 (최대 MAX_REDIRECTS 회).
          // axios 에 맡기면 중간 홉에 대한 검증이 불가능하여, 리다이렉션을
          // 이용한 내부망(SSRF) 접근으로 우회될 수 있기 때문이다.
          for (let hop = 0; ; hop++) {
            // 홉마다 DNS 를 조회/검증하고, 검증을 통과한 주소로만 연결한다. (DNS rebinding 방지)
            const validatedAddresses = await resolveValidatedAddresses(url);
            remote_res = await axios.get(url.toString(), {
              timeout: 10000,
              signal: abortController.signal,
              maxRedirects: 0,
              // 검증된 주소 목록으로 DNS 결과를 대체한다.
              lookup: (_hostname, _options, callback) => {
                callback(null, validatedAddresses);
              },
              onDownloadProgress(progressEvent) {
                if (progressEvent.loaded > REMOTE_MEDIA_SIZE_LIMIT) {
                  RemoteImageProxy.logger.error('max file size exceeded', progressEvent.loaded);
                  abortController.abort();
                }
              },
              responseType: 'stream',
              validateStatus: () => {
                // ignore response code because we handle manually
                return true;
              },
            });

            const location = remote_res.headers['location'];
            const isRedirectStatus = [301, 302, 303, 307, 308].includes(remote_res.status);
            if (!isRedirectStatus || typeof location !== 'string' || location.length === 0 || hop >= MAX_REDIRECTS) {
              break;
            }
            if (Date.now() > deadline) {
              throw new Error('total redirect time budget exceeded');
            }
            // 다음 홉 URL 계산 (상대 경로 Location 포함)
            const nextUrl = new URL(location, url);
            if (nextUrl.protocol !== 'http:' && nextUrl.protocol !== 'https:') {
              throw new Error(`redirect to disallowed protocol ${nextUrl.protocol}`);
            }
            // 이전 홉의 응답 스트림 정리
            remote_res.data?.destroy?.();
            url = nextUrl;
          }
        } catch (err) {
          if (err instanceof RemoteResolutionError) {
            const res = sendApiError(400, err.message, 'BAD_REQUEST');
            res.headers.set('Cache-Control', 'public, max-age=3600');
            return res;
          }
          if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') {
            const res = sendApiError(413, `Remote Content Too Large`, 'REMOTE_MEDIA_TOO_LARGE');
            res.headers.set('Cache-Control', 'public, max-age=3600');
            return res;
          } else {
            const res = sendApiError(500, `${String(err)}`, 'SERVER_ERROR');
            res.headers.set('Cache-Control', 'public, max-age=600');
            return res;
          }
        }

        if (remote_res.status === 404) {
          const not_found_res = sendApiError(
            remote_res.status,
            `Proxy Fail! Remote Server Send NOT_FOUND`,
            'NOT_FOUND',
          );
          not_found_res.headers.set('Cache-Control', 'public, max-age=3600');
          return not_found_res;
        } else if (!(remote_res.status === 200)) {
          const error_res = sendApiError(
            500,
            `Proxy Fail! Remote server Sent ${remote_res.status}`,
            'REMOTE_SERVER_UNKNOWN_ERROR',
          );
          error_res.headers.set('Cache-Control', 'public, max-age=600');
          return error_res;
        }
        const content_length_value = remote_res.headers['content-length'];
        let content_length: number | undefined = undefined;
        let content_type = remote_res.headers['content-type'];
        if (typeof content_length_value === 'string' && isNumberString(content_length_value)) {
          content_length = parseInt(content_length_value);
          if (content_length > REMOTE_MEDIA_SIZE_LIMIT) {
            abortController.abort();
            const res = sendApiError(413, `Remote Content Too Large`, 'REMOTE_MEDIA_TOO_LARGE');
            res.headers.set('Cache-Control', 'public, max-age=3600');
            return res;
          }
        }
        if (typeof content_type !== 'string' || !content_type.startsWith('image/')) {
          content_type = 'application/octet-stream';
        }
        const remote_filename = new RE2(/filename="([^";]+)"/).exec(
          remote_res.headers['content-disposition'] ?? '',
        )?.[1];
        const content_disposition = `inline; filename=${remote_filename ?? url.pathname.split('/').at(-1) + this.getExtension(content_type)}`;
        const last_modified = remote_res.headers['last-modified'];
        const etag = remote_res.headers['etag'];

        const resHeader = {
          ...(content_length ? { 'content-length': String(content_length) } : {}),
          'Content-Type': content_type,
          'Content-Disposition': content_disposition,
          'Cache-Control': 'public, max-age=31536000, immutable',
          ...(last_modified ? { 'last-modified': last_modified } : {}),
          ...(etag ? { etag: etag } : {}),
        };

        const res = new NextResponse(remote_res.data, {
          headers: resHeader,
        });
        return res;
      } catch (err) {
        abortController.abort();
        return sendApiError(500, `${String(err)}`, 'SERVER_ERROR');
      }
    } else {
      return sendApiError(400, `No url param`, 'BAD_REQUEST');
    }
  }

  private static getExtension(content_type: string) {
    let ext = '';
    switch (content_type) {
      case 'image/png':
      case 'image/apng':
        ext = '.png';
        break;
      case 'image/bmp':
        ext = '.bmp';
        break;
      case 'image/gif':
        ext = '.gif';
        break;
      case 'image/jpeg':
        ext = '.jpg';
        break;
      case 'image/webp':
        ext = '.webp';
        break;
      default:
    }
    return ext;
  }
}
