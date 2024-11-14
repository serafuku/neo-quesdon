import { CreateQuestionDto } from "@/app/_dto/create_question/create-question.dto";
import { PrismaClient } from "@prisma/client";
import type { user } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../functions/web/verify-jwt";

export async function POST(req: NextRequest) {
  const prisma = new PrismaClient();

  try {
    const body: CreateQuestionDto = await req.json();
    const newQuestion = await prisma.question.create({
      data: {
        question: body.question,
        questioner: body.questioner,
        questioneeHandle: body.questionee,
      },
    });

    const questionee_user = await prisma.user.findUnique({
      where: {
        handle: body.questionee,
      },
    });
    if (!questionee_user) {
      throw new Error(`questionee_user not found`);
    }
    if (body.questioner) {
      const token = req.cookies.get('jwtToken')?.value;
      try {
        if (typeof token !== 'string') {
          throw new Error(`no token`);
        }
        const tokenPayload = await verifyToken(token);
        if (tokenPayload.handle.toLowerCase() !== body.questioner.toLowerCase()) {
          throw new Error(`Token and questioner not match`);
        }
      } catch (err) {
        console.log(`questioner verify ERROR! ${err}`);
      }
    }
  
    const url = `${process.env.WEB_URL}/main/questions`;
    sendNotify(questionee_user, newQuestion.question, url);
    
    // notify send 기다라지 않고 202반환
    return NextResponse.json({ status: 202 });
  } catch (err) {
    console.log(err);
  }
  return NextResponse.json({ status: 500 });
}


async function sendNotify(questionee: user, question: string, url: string): Promise<void> {
  const notify_host = process.env.NOTI_HOST;
  try {
    await fetch(`https://${notify_host}/api/notes/create`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.NOTI_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visibleUserIds: [questionee.userId],
        visibility: "specified",
        text: `${questionee.handle} <네오-퀘스돈> 새로운 질문이에요!\nQ. ${question}\n ${url}`,
      }),
    });
  }
  catch (error) {
    console.warn('Post-question: fail to send notify: ', error);
  }
}