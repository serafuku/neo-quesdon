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

    const getUserId = await prisma.user.findUnique({
      where: {
        handle: body.questionee,
      },
    });

    await fetch(`https://serafuku.moe/api/notes/create`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.NOTI_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visibleUserIds: [getUserId?.userId],
        visibility: "specified",
        text: `${body.questionee} <네오-퀘스돈> 새로운 질문이에요!\nQ. ${body.question}\nhttps://${body.address}/main/questions`,
      }),
    });
    return NextResponse.json({ status: 200 });
  } catch (err) {
    console.log(err);
  }
  return NextResponse.json({ status: 500 });
}
