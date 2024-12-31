/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { AnswerService } from '@/_service/answer/answer-service';

export async function POST(req: NextRequest) {
  const service = AnswerService.getInstance();
  return await service.createAnswerApi(req, null as any, null as any);
}

export async function GET(req: NextRequest) {
  const service = AnswerService.getInstance();
  return await service.GetAllAnswersApi(req);
}
