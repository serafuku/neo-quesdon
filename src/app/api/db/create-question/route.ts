import { CreateQuestionDto } from "@/app/_dto/create_question/create-question.dto";
import type { user } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../functions/web/verify-jwt";
import { validateStrict } from "@/utils/validator/strictValidator";
import { sendErrorResponse } from "../../functions/web/errorResponse";
import { GetPrismaClient } from "@/utils/getPrismaClient/get-prisma-client";
import { Logger } from "@/utils/logger/Logger";
const logger = new Logger('create-question');

export async function POST(req: NextRequest) {
  const prisma = GetPrismaClient.getClient();
  try {
    const body = await req.json();
    let data;
    try {
      data = await validateStrict(CreateQuestionDto, body);
    } catch (errors) {
      return sendErrorResponse(400, `${errors}`);
    }

    const questionee_user = await prisma.user.findUniqueOrThrow({
      where: {
        handle: data.questionee,
      },
    });
    const questionee_profile = await prisma.profile.findUniqueOrThrow({
      where: {
        handle: questionee_user?.handle,
      },
    });

    if (questionee_profile.stopAnonQuestion && !data.questioner) {
      throw new Error("The user has prohibits anonymous questions.");
    } else if (questionee_profile.stopNewQuestion) {
      throw new Error("User stops NewQuestion");
    }

    // 제시된 questioner 핸들이 JWT토큰의 핸들과 일치하는지 검사
    if (data.questioner) {
      const token = req.cookies.get("jwtToken")?.value;
      try {
        if (typeof token !== "string") {
          throw new Error(`Token is not string!`);
        }
        const tokenPayload = await verifyToken(token);
        if (
          tokenPayload.handle.toLowerCase() !== data.questioner.toLowerCase()
        ) {
          throw new Error(`Token and questioner not match`);
        }
      } catch (err) {
        logger.log(`questioner verify ERROR! ${err}`);
        return sendErrorResponse(403, `${err}`);
      }
    }

    //질문 생성
    const newQuestion = await prisma.question.create({
      data: {
        question: data.question,
        questioner: data.questioner,
        questioneeHandle: data.questionee,
      },
    });

    const userSettings = await prisma.profile.findUnique({
      where: {
        handle: data.questionee,
      },
    });

    if (userSettings && userSettings.stopNotiNewQuestion === true) {
      // 알림 전송 스킵
    } else {
      // 알림 전송
      const url = `${process.env.WEB_URL}/main/questions`;
      setImmediate(() => {
        sendNotify(questionee_user, newQuestion.question, url);
      });
    }

    // notify send 기다라지 않고 200반환
    return NextResponse.json({}, { status: 200 });
  } catch (err) {
    return NextResponse.json(`Error! ${err}`, { status: 500 });
  }
}

async function sendNotify(
  questionee: user,
  question: string,
  url: string
): Promise<void> {
  const notify_host = process.env.NOTI_HOST;
  logger.log(`try to send notification to ${questionee.handle}`);
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
    if (res.ok === false) {
      throw new Error(`Note create error`);
    }
  } catch (error) {
    logger.error("Post-question: fail to send notify: ", error);
  }
}
