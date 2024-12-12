import { Logger } from '@/utils/logger/Logger';
import { IncomingMessage } from 'http';
import { NextRequest } from 'next/server';

const logger = new Logger('get-ip-from-request');
export function getIpFromIncomingMessage(req: IncomingMessage) {
  const x_forward_header = req.headers['x-forwarded-for'];
  if (typeof x_forward_header !== 'string') {
    logger.debug(`x-forwarded-for is not string`);
    return '127.0.0.1';
  }
  const ip = x_forward_header.split(',')[0].replaceAll(' ', '');
  if (!ip) {
    logger.warn('IP detect fail!');
  }
  return ip ?? '127.1.2.3';
}

export function getIpFromRequest(req: NextRequest) {
  const x_forward_header = req.headers.get('x-forwarded-for');
  if (typeof x_forward_header !== 'string') {
    logger.debug(`x-forwarded-for is not string`);
    return '127.0.0.1';
  }
  const ip = x_forward_header.split(',')[0].replaceAll(' ', '');
  if (!ip) {
    logger.warn('IP detect fail!');
  }
  return ip ?? '127.1.2.3';
}
