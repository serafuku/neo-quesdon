import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const prisma = new PrismaClient();
  const questions = await prisma.question.findMany({
    where: {
      questioneeHandle: body,
    },
  });

  return NextResponse.json(questions);
}
