import { FetchUserAnswersDto } from "@/app/_dto/fetch-user-answers/fetch-user-answers.dto";
import { validateStrict } from "@/utils/validator/strictValidator";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { sendErrorResponse } from "../../functions/web/errorResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let data;
    try {
      data = await validateStrict(FetchUserAnswersDto, body);
    } catch (err) {
      return sendErrorResponse(400, `${err}`);
    }

    const prisma = new PrismaClient();
    const query_limit = data.limit
      ? Math.max(1, Math.min(data.limit, 100))
      : 100;
    const sinceId = data.sinceId;
    const untilId = data.untilId;

    //내림차순이 기본값
    const orderBy = data.sort === "ASC" ? "asc" : "desc";

    if (!data.answeredPersonHandle) {
      throw new Error(`answeredPersonHandle is null`);
    }
    const res = await prisma.answer.findMany({
      where: {
        answeredPersonHandle: data.answeredPersonHandle,
        id: {
          ...(typeof sinceId === "string" ? { gt: sinceId } : {}),
          ...(typeof untilId === "string" ? { lt: untilId } : {}),
        },
      },
      include: {
        answeredPerson: true,
      },
      orderBy: {
        id: orderBy,
      },
      take: query_limit,
    });

    const answerCount = await prisma.profile.findMany({
      where: {
        handle: data.answeredPersonHandle,
      },
      select: {
        _count: {
          select: {
            answer: true,
          },
        },
      },
    });

    return NextResponse.json({
      answers: res,
      count: answerCount[0]._count.answer,
    });
  } catch (err) {
    console.log(err);
  }
}
