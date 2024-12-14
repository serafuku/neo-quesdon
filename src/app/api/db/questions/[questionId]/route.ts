import { QuestionService } from '@/app/api/_service/question/question-service';
import { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { NextRequest } from 'next/server';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  const questionService = QuestionService.getInstance();
  const string_id = (await params).questionId;
  const id = Number.parseInt(string_id, 10);
  return await questionService.deleteQuestionApi(req, id, {} as jwtPayloadType);
}
