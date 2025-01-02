import { ApiErrorResponseDto } from '@/app/_dto/api-error/api-error.dto';
import { ApiErrorTypes } from '@/app/_dto/api-error/apiErrorTypes';
import { NextResponse } from 'next/server';

export function sendApiError(code: number, message: string | string[], errorType: ApiErrorTypes) {
  const errorRes: ApiErrorResponseDto = {
    error_type: errorType,
    message: message,
  };
  return NextResponse.json(errorRes, { status: code });
}
