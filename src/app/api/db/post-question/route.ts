import { PrismaClient } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const prisma = new PrismaClient();

  try {
    const newQuestion = await prisma.question.create({
      data: {
        question: body.question,
        questioner: body.questioner,
        questioneeHandle: body.questionee,
      },
    });
    return NextResponse.json({ status: 200 });
  } catch (err) {
    console.log(err);
  }
  return NextResponse.json({ status: 500 });
}
