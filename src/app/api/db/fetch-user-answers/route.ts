import { NextRequest } from 'next/server';
import { AnswerService } from '@/app/api/db/_answer-service/_answer-service';

export async function POST(req: NextRequest) {
  const service = AnswerService.get();
  return await service.fetchUserAnswers(req);
}
