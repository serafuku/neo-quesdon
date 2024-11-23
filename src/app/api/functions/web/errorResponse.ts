import { NextResponse } from 'next/server';

export function sendErrorResponse(code: number, message: string) {
  return NextResponse.json({ status: code, message: message }, { status: code });
}
