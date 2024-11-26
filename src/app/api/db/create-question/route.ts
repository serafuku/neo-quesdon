import { NextRequest } from 'next/server';
import { CreateQuestionApiService } from './_service';

export async function POST(req: NextRequest) {
  const service = CreateQuestionApiService.get();
  return await service.POST(req);
}
