import { NextRequest } from 'next/server';
import { AnswerService } from '@/_service/answer/answer-service';
import { jwtPayloadType } from '@/api/_utils/jwt/jwtPayloadType';

export async function POST(req: NextRequest) {
  const service = AnswerService.getInstance();
  return await service.createAnswerApi(req, null as unknown as jwtPayloadType);
}

export async function GET(req: NextRequest) {
  const service = AnswerService.getInstance();
  return await service.GetAllAnswersApi(req);
}
