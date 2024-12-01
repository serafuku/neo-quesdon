import { NextRequest } from 'next/server';
import { CreateQuestionApiService } from '@/api/db/create-question/_service';

export async function POST(req: NextRequest) {
  const service = CreateQuestionApiService.get();
  return await service.CreateQuestion(req);
}
