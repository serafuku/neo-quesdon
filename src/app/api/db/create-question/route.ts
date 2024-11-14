import { CreateQuestionDto } from "@/app/_dto/create_question/create-question.dto";
import { PrismaClient } from "@prisma/client";
import type { user } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../functions/web/verify-jwt";

export async function POST(req: NextRequest) {
  const prisma = new PrismaClient();

  try {
    const body: CreateQuestionDto = await req.json();
    const questionee_user = await prisma.user.findUnique({
      where: {
        handle: body.questionee,
      },
    });

    if (!questionee_user) {
      throw new Error(`questionee_user not found`);
    }
    // 제시된 questioner 핸들이 JWT토큰의 핸들과 일치하는지 검사
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
        throw(err);
      }
    }

    //질문 생성
    const newQuestion = await prisma.question.create({
      data: {
        question: body.question,
        questioner: body.questioner,
        questioneeHandle: body.questionee,
      },
    });
  
    //알림 전송
    const url = `${process.env.WEB_URL}/main/questions`;
    setImmediate(() => {
      sendNotify(questionee_user, newQuestion.question, url);
    });
    
    // notify send 기다라지 않고 200반환
    return NextResponse.json({ status: 200 });
  } catch (err) {
    return NextResponse.json(`Error! ${err}`, { status: 500 });
  }
}


async function sendNotify(questionee: user, question: string, url: string): Promise<void> {
  const notify_host = process.env.NOTI_HOST;
  console.log(`try to send notification to ${questionee.handle}`);
  try {
    const res = await fetch(`https://${notify_host}/api/notes/create`, {
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
    if (res.status !== 200){
      throw new Error(`Note create error`);
    }
  }
  catch (error) {
    console.error('Post-question: fail to send notify: ', error);
  }
}