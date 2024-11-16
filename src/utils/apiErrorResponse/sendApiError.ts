import { NextResponse } from "next/server";

export function sendApiError(code: number, message: string | string[]) {
  return NextResponse.json({ code: code, message: message }, { status: code });
}
