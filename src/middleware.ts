import { NextResponse, type NextRequest } from "next/server";

export default function middleware(req: NextRequest) {
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-pathname", req.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers: reqHeaders,
    },
  });
}
