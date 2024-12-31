/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlockingService } from '@/app/api/_service/blocking/blocking-service';
import { sendApiError } from '@/app/api/_utils/apiErrorResponse/sendApiError';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const blockService = BlockingService.get();
  try {
    return await blockService.importBlockFromRemote(req, null as any);
  } catch (err) {
    return sendApiError(500, `ERROR! ${err}`, 'SERVER_ERROR');
  }
}
