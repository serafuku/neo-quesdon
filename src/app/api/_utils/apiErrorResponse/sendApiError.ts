import { ApiErrorTypes } from '@/app/_dto/apiErrorTypes';
import { NextResponse } from 'next/server';

export function sendApiError(code: number, message: string | string[], errorType: ApiErrorTypes) {
  return NextResponse.json({ error_type: errorType, message: message }, { status: code });
}
