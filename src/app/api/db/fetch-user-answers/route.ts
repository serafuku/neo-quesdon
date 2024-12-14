import { NextRequest } from 'next/server';
import { AnswerService } from '@/_service/answer/answer-service';

export async function POST(req: NextRequest) {
  const service = AnswerService.getInstance();
  return await service.fetchUserAnswers(req);
}
