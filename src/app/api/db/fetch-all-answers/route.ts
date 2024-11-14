import { AnswerDto } from "@/app/_dto/fetch-all-answers/Answers.dto";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  const prisma = new PrismaClient();

  const answers: AnswerDto[] = await prisma.answer.findMany({});

  if (answers) {
    return NextResponse.json(answers, { status: 200 });
  } else {
    return NextResponse.json({ status: 500 });
  }
}
