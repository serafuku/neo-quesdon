/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { QuestionService } from '@/app/api/_service/question/question-service';

export async function POST(req: NextRequest) {
  const service = QuestionService.getInstance();
  return await service.CreateQuestionApi(req, null as any, null as any);
}

export async function GET(req: NextRequest) {
  const service = QuestionService.getInstance();
  return await service.GetMyQuestionsApi(req, null as any);
}

export async function DELETE(req: NextRequest) {
  const service = QuestionService.getInstance();
  return await service.deleteAllQuestionsApi(req, null as any);
}
