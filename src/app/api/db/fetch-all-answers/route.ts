import { AnswerDto } from "@/app/_dto/fetch-all-answers/Answers.dto";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const prisma = new PrismaClient();
  const params = req.nextUrl.searchParams;
  const lastId = params.get("cursor") || undefined;
  const limit = parseInt(params.get("limit") ?? "5");

  try {
    const answers: AnswerDto[] = await prisma.answer.findMany({
      take: limit,
      skip: lastId ? 1 : 0,
      ...(lastId && { cursor: { id: lastId } }),
      orderBy: {
        id: "desc",
      },
    });

    const nextCursor =
      answers.length === limit ? answers[answers.length - 1].id : null;

    if (answers) {
      return NextResponse.json({ answers, nextCursor }, { status: 200 });
    }
  } catch (err) {
    return NextResponse.json({ msg: err }, { status: 500 });
  }
}
