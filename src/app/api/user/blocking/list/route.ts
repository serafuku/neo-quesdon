/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { BlockingService } from '@/app/api/_service/blocking/blocking-service';

export async function POST(req: NextRequest) {
  const service = BlockingService.get();
  return await service.getBlockList(req, null as any, null as any);
}
