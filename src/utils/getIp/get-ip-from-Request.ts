import { NextRequest } from "next/server";
import { Logger } from "../logger/Logger";

const logger = new Logger('get-ip-from-request');
export function getIpFromRequest(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].replace(' ', '');
  if (!ip){
    logger.warn('IP detect fail!');
  }
  return ip ?? '127.1.2.3';
}