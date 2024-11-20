import { AnswerDto } from "@/app/_dto/Answers.dto";
import { FetchAllAnswersReqDto } from "@/app/_dto/fetch-all-answers/fetch-all-answers.dto";
import { sendApiError } from "@/utils/apiErrorResponse/sendApiError";
import { validateStrict } from "@/utils/validator/strictValidator";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  let data;
  try {
    data = await validateStrict(FetchAllAnswersReqDto, body);
  } catch (err) {
    return sendApiError(400, `${err}`);
  }



  const query_limit = data.limit ? Math.max(1, Math.min(data.limit, 100)) : 100;
  const prisma = new PrismaClient();
  const sinceId = data.sinceId;
  const untilId = data.untilId;

  //내림차순이 기본값
  const orderBy = (data.sort === 'ASC') ? 'asc' : 'desc';

  const answersWithProfile = await prisma.answer.findMany({
    where: {
      id: {
        ...(typeof sinceId === 'string' ? { gt: sinceId } : {}),
        ...(typeof untilId === 'string' ? { lt: untilId } : {}),
      },
    },
    include: {
      answeredPerson: true,
    },
    orderBy: {
      id: orderBy
    }, 
    take: query_limit
  });
  

  return NextResponse.json(answersWithProfile as unknown as AnswerDto);
}
