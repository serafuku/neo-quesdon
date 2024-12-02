import { AnswerService } from '@/app/api/db/_answer-service/_answer-service';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const service = AnswerService.get();
  return await service.fetchAll(req);
}
