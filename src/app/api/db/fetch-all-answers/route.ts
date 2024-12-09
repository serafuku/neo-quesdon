import { AnswerService } from '@/_service/answer/answer-service';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const service = AnswerService.get();
  return await service.fetchAll(req);
}
