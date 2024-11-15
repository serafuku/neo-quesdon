import { FetchAllAnswersDto } from "@/app/_dto/fetch-all-answers/fetch-all-answers.dto";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body: FetchAllAnswersDto = await req.json();
  if (typeof body !== 'object') {
    return NextResponse.error();
  }

  const query_limit = body.limit ? Math.max(1, Math.min(body.limit, 100)) : 100;
  const prisma = new PrismaClient();
  const sinceId = body.sinceId;
  const untilId = body.untilId;

  //내림차순이 기본값
  const orderBy = (body.sort === 'ASC') ? 'asc' : 'desc';

  const questions = await prisma.answer.findMany({
    where: {
      id: {
        ...(typeof sinceId === 'string' ? { gt: sinceId } : {}),
        ...(typeof untilId === 'string' ? { lt: untilId } : {}),
      },
    },
    orderBy: {
      id: orderBy
    }, 
    take: query_limit
  });

  return NextResponse.json(questions);
}
