import { AnswerService } from '@/app/api/_service/answer/answer-service';
import { jwtPayloadType } from '@/app/api/_utils/jwt/jwtPayloadType';
import { NextRequest } from 'next/server';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ answerId: string }> }) {
  const service = AnswerService.getInstance();
  const answerId = (await params).answerId;
  return await service.deleteAnswer(req, answerId, null as unknown as jwtPayloadType);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ userHandle:string, answerId: string }> }) {
  const service = AnswerService.getInstance();
  const { answerId, userHandle } = await params;
  return await service.GetSingleAnswerApi(req, answerId, userHandle);
}
