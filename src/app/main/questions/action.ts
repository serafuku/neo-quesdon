"use server";

import type { mastodonTootAnswers, MkNoteAnswers, typedAnswer } from "@/app";
import { verifyToken } from "@/app/api/functions/web/verify-jwt";
import { sendApiError } from "@/utils/apiErrorResponse/sendApiError";
import { GetPrismaClient } from "@/utils/getPrismaClient/get-prisma-client";
import { question } from "@prisma/client";
import { createHash } from "crypto";
import { cookies } from "next/headers";

export async function getQuestion(id: number) {
  const prisma = GetPrismaClient.getClient();

  const findWithId = await prisma.question.findUnique({
    where: {
      id: id,
    },
  });

  return findWithId;
}

export async function postAnswer(
  questionId: question["id"] | null,
  answer: typedAnswer
) {
  const prisma = GetPrismaClient.getClient();
  const cookieStore = await cookies();
  const jwtToken = cookieStore.get('jwtToken')?.value;
  let tokenPayload;
  // JWT 토큰 검증
  try {
    tokenPayload = await verifyToken(jwtToken);
  } catch (err) {
    return sendApiError(401, "Unauthorized");
  }


  if (questionId !== null) {
    // 트랜잭션으로 All or Nothing 처리
    const [question, postWithAnswer] = await prisma.$transaction(async (tx) => {
      const q = await tx.question.findUniqueOrThrow({ where: { id: questionId } });
      if (q.questioneeHandle !== tokenPayload.handle) {
        throw new Error(`This question is not for you`);
      }
      const a = await tx.answer.create({
        data: {
          question: q.question,
          questioner: q.questioner,
          answer: answer.answer,
          answeredPersonHandle: tokenPayload.handle,
          nsfwedAnswer: answer.nsfwedAnswer,
        },
      });
      await tx.question.delete({
        where: {
          id: q.id,
        },
      });

      return [q, a];
    });
    const answeredUser = await prisma.user.findUniqueOrThrow({
      where: {
        handle: tokenPayload.handle,
      },
    });

    const server = await prisma.server.findUniqueOrThrow({
      where: {
        instances: answeredUser.hostName,
      },
    });

    const instanceType = server.instanceType;

    const baseUrl = process.env.WEB_URL;
    const answerUrl = `${baseUrl}/main/user/${answeredUser.handle}/${postWithAnswer.id}`;
    console.log("Created new answer:", answerUrl);
    //답변 올리는 부분
    const userSettings = await prisma.profile.findUniqueOrThrow({
      where: {
        handle: tokenPayload.handle,
      },
    });
    if (!userSettings.stopPostAnswer) {
      if (answeredUser && server) {
        const i = createHash("sha256")
          .update(answeredUser.token + server.appSecret, "utf-8")
          .digest("hex");
        const host = answeredUser.hostName;
        if (answer.nsfwedAnswer === true && question.questioner === null) {
          const title = `⚠️ 이 질문은 NSFW한 질문이에요! #neo_quesdon`;
          const text = `Q: ${question.question}\nA: ${answer.answer}\n#neo_quesdon ${answerUrl}`;
          if (instanceType === "misskey" || instanceType === "cherrypick") {
            await mkMisskeyNote(i, title, text, host, answer.visibility);
          } else {
            await mastodonToot(
              answeredUser.token,
              title,
              text,
              host,
              answer.visibility
            );
          }
        } else if (
          answer.nsfwedAnswer === false &&
          question.questioner !== null
        ) {
          const title = `Q: ${question.question} #neo_quesdon`;
          const text = `질문자:${question.questioner}\nA: ${answer.answer}\n#neo_quesdon ${answerUrl}`;
          if (instanceType === "misskey" || instanceType === "cherrypick") {
            await mkMisskeyNote(i, title, text, host, answer.visibility);
          } else {
            await mastodonToot(
              answeredUser.token,
              title,
              text,
              host,
              answer.visibility
            );
          }
        } else if (
          answer.nsfwedAnswer === true &&
          question.questioner !== null
        ) {
          const title = `⚠️ 이 질문은 NSFW한 질문이에요! #neo_quesdon`;
          const text = `질문자:${question.questioner}\nQ:${question.question}\nA: ${answer.answer}\n#neo_quesdon ${answerUrl}`;
          if (instanceType === "misskey" || instanceType === "cherrypick") {
            await mkMisskeyNote(i, title, text, host, answer.visibility);
          } else {
            await mastodonToot(
              answeredUser.token,
              title,
              text,
              host,
              answer.visibility
            );
          }
        } else {
          const title = `Q: ${question.question} #neo_quesdon`;
          const text = `A: ${answer.answer}\n#neo_quesdon ${answerUrl}`;
          if (instanceType === "misskey" || instanceType === "cherrypick") {
            await mkMisskeyNote(i, title, text, host, answer.visibility);
          } else {
            await mastodonToot(
              answeredUser.token,
              title,
              text,
              host,
              answer.visibility
            );
          }
        }
      } else {
        console.log("user not found");
      }
    }
  }
}

async function mkMisskeyNote(
  i: string,
  title: string,
  text: string,
  hostname: string,
  visibility: "public" | "home" | "followers"
) {
  // 미스키 CW길이제한 처리
  if (title.length > 100) {
    title = title.substring(0, 90) + '.....'
  }

  const newAnswerNote: MkNoteAnswers = {
    cw: title,
    text: text,
    visibility: visibility,
  };
  const res = await fetch(`https://${hostname}/api/notes/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${i}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newAnswerNote),
  });
  if (!res.ok) {
    console.warn(`Note create fail! `, res.status, res.statusText);
  }
}

async function mastodonToot(
  i: string,
  title: string,
  text: string,
  hostname: string,
  visibility: "public" | "home" | "followers"
) {
  let newVisibility: "public" | "unlisted" | "private";
  switch (visibility) {
    case "public":
      newVisibility = "public";
      break;
    case "home":
      newVisibility = "unlisted";
      break;
    case "followers":
      newVisibility = "private";
      break;
    default:
      newVisibility = "public";
      break;
  }
  const newAnswerToot: mastodonTootAnswers = {
    spoiler_text: title,
    status: text,
    visibility: newVisibility,
  };
  try {
    const res = await fetch(`https://${hostname}/api/v1/statuses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${i}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newAnswerToot),
    });

    if (!res.ok) {
      throw new Error(`HTTP Error! status:${res.status}`);
    }
  } catch (err) {
    console.warn(`Toot Create Fail!`, err);
  }
}

export async function deleteQuestion(id: number) {
  const prisma = GetPrismaClient.getClient();
  const cookieStore = await cookies();
  const jwtToken = cookieStore.get("jwtToken")?.value;
  try {
    const tokenPayload = await verifyToken(jwtToken);
    await prisma.$transaction(async (tr) => {
      const q = await tr.question.findUniqueOrThrow({where: {id: id}});
      if (q.questioneeHandle !== tokenPayload.handle) {
        throw new Error(`You Can't delete this question`);
      }
      await tr.question.delete({
        where: {
          id: id,
        },
      });
    })
  } catch (err) {
    throw new Error(`JWT Token Verification Error: ${err}`);
  }
}
