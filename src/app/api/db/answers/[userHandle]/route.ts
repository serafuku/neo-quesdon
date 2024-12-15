import { AnswerService } from '@/app/api/_service/answer/answer-service';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userHandle: string }> }) {
  const answerService = AnswerService.getInstance();
  const { userHandle } = await params;
  const handle = decodeURIComponent(userHandle);
  return await answerService.fetchUserAnswers(req, handle);
}
