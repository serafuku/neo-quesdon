import { FetchUserAnswersDto } from "@/app/_dto/fetch-user-answers/fetch-user-answers.dto";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body:FetchUserAnswersDto = await req.json();
    const prisma = new PrismaClient();
    const query_limit = body.limit ? Math.max(1, Math.min(body.limit, 100)) : 100;
    const sinceId = body.sinceId;
    const untilId = body.untilId;
  
    //내림차순이 기본값
    const orderBy = (body.sort === 'ASC') ? 'asc' : 'desc';

    if (!body.answeredPersonHandle) {
      throw new Error(`answeredPersonHandle is null`);
    }
    const res = await prisma.answer.findMany({
      where: {
        answeredPersonHandle: body.answeredPersonHandle,
        id: {
          ...(typeof sinceId === 'string' ? { gt: sinceId } : {}),
          ...(typeof untilId === 'string' ? { lt: untilId } : {}),
        },
      },
      orderBy: {
        id: orderBy
      }, 
      take: query_limit
      },
    );

    return NextResponse.json(res);
  } catch (err) {
    console.log(err);
  }
}
