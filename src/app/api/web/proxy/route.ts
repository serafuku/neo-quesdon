import { RateLimit } from '@/app/api/_service/ratelimiter/decorator';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { isFQDN, isNumberString } from 'class-validator';
import { NextRequest, NextResponse } from 'next/server';
import { Address4 } from 'ip-address';
import dns from 'dns';
import RE2 from 're2';
import axios from 'axios';
import { Logger } from '@/utils/logger/Logger';

export async function GET(req: NextRequest) {
  return RemoteImageProxy.imageProxy(req);
}

class RemoteImageProxy {
  private static logger = new Logger('RemoteImageProxy');
  @RateLimit({ bucket_time: 600, req_limit: 600 }, 'ip')
  public static async imageProxy(req: NextRequest): Promise<NextResponse | Response> {
    const REMOTE_MEDIA_SIZE_LIMIT = 31457280;
    const searchParams = req.nextUrl.searchParams;
    const urlParam = searchParams.get('url');

    if (urlParam) {
      const abortController = new AbortController();
      try {
        let url: URL;
        try {
          url = new URL(decodeURIComponent(urlParam));
          if (!isFQDN(url.hostname)) {
            return sendApiError(400, 'URL hostname is not FQDN');
          }
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return sendApiError(400, 'protocol is not http/https');
          }
          const remoteIp = await new Promise<string>((resolve, reject) => {
            dns.lookup(url.hostname, 4, (err, address) => {
              if (err) {
                reject(err);
              }
              resolve(address);
            });
          });

          const address = new Address4(remoteIp);
          if (
            !address.isCorrect() ||
            address.isMulticast() ||
            address.isInSubnet(new Address4('0.0.0.0/8')) ||
            address.isInSubnet(new Address4('127.0.0.0/8')) ||
            address.isInSubnet(new Address4('10.0.0.0/8')) ||
            address.isInSubnet(new Address4('192.168.0.0/16')) ||
            address.isInSubnet(new Address4('172.16.0.0/12')) ||
            address.isInSubnet(new Address4('100.64.0.0/10'))
          ) {
            return sendApiError(400, 'Proxy to private network not allowed');
          }
        } catch (err) {
          return sendApiError(400, `${String(err)}`);
        }
        const remote_res = await axios.get(url.toString(), {
          signal: abortController.signal,
          onDownloadProgress(progressEvent) {
            if (progressEvent.loaded > REMOTE_MEDIA_SIZE_LIMIT) {
              RemoteImageProxy.logger.error('max file size exceeded', progressEvent.loaded);
              abortController.abort();
            }
          },
          responseType: 'stream',
        });

        if (!(remote_res.status === 200)) {
          return sendApiError(400, `Proxy Fail! Remote server Sent ${remote_res.status}`);
        }
        const content_length = remote_res.headers['content-length'];
        let content_type = remote_res.headers['content-type'];
        if (isNumberString(content_length)) {
          if (parseInt(content_length) > REMOTE_MEDIA_SIZE_LIMIT) {
            abortController.abort();
            return sendApiError(413, `Remote Content Too Large`);
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
          ...(content_length ? { 'content-length': content_length } : {}),
          'Content-Type': content_type,
          'Content-Disposition': content_disposition,
          'Cache-Control': 'public, max-age=31536000',
          ...(last_modified ? { 'last-modified': last_modified } : {}),
          ...(etag ? { etag: etag } : {}),
        };

        const res = new NextResponse(remote_res.data, {
          headers: resHeader,
        });
        return res;
      } catch (err) {
        abortController.abort();
        return sendApiError(500, `${String(err)}`);
      }
    } else {
      return sendApiError(400, `No url param`);
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
