import { NextRequest } from 'next/server';
import { QuestionService } from '@/app/api/_service/question/question-service';
import { jwtPayloadType } from '@/api/_utils/jwt/jwtPayloadType';

export async function POST(req: NextRequest) {
  const service = QuestionService.getInstance();
  return await service.CreateQuestionApi(req, null as unknown as jwtPayloadType);
}

export async function GET(req: NextRequest) {
  const service = QuestionService.getInstance();
  return await service.GetMyQuestionsApi(req, null as unknown as jwtPayloadType);
}

export async function DELETE(req: NextRequest) {
  const service = QuestionService.getInstance();
  return await service.deleteAllQuestionsApi(req, null as unknown as jwtPayloadType);
}
