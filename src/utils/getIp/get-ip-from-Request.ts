import { NextRequest } from "next/server";

export function getIpFromRequest(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(/, /)[0];
  return ip ?? '127.1.2.3';
}