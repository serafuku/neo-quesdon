"use server";

import type { mastodonTootAnswers, MkNoteAnswers, typedAnswer } from "@/app";
import detectInstance from "@/app/api/functions/web/detectInstance";
import { verifyToken } from "@/app/api/functions/web/verify-jwt";
import { PrismaClient, question } from "@prisma/client";
import { createHash } from "crypto";
import { cookies } from "next/headers";

export async function getQuestion(id: number) {
  const prisma = new PrismaClient();

  const findWithId = await prisma.question.findUnique({
    where: {
      id: id,
    },
  });

  return findWithId;
}

export async function postAnswer(
  question: question | null,
  answer: typedAnswer
) {
  const prisma = new PrismaClient();

  if (question !== null) {
    const postWithAnswer = await prisma.answer.create({
      data: {
        question: question.question,
        questioner: question.questioner,
        answer: answer.answer,
        answeredPersonHandle: question.questioneeHandle,
        nsfwedAnswer: answer.nsfwedAnswer,
      },
    });

    const deleteQuestion = await prisma.question.delete({
      where: {
        id: question.id,
      },
    });

    const answeredUser = await prisma.user.findUnique({
      where: {
        handle: question.questioneeHandle,
      },
    });

    const server = await prisma.server.findUnique({
      where: {
        instances: answeredUser?.hostName,
      },
    });

    const userSettings = await prisma.profile.findUnique({
      where: {
        handle: question.questioneeHandle,
      },
    });

    if (server) {
      const instanceType = await detectInstance(server.instances);

      console.log(instanceType);

      //답변 올리는 부분
      if (userSettings && !userSettings.stopPostAnswer) {
        const baseUrl = process.env.WEB_URL;
        const answerUrl = `${baseUrl}/main/user/${answer.answeredPersonHandle}/${postWithAnswer.id}`;

        if (answeredUser && server) {
          const i = createHash("sha256")
            .update(answeredUser.token + server.appSecret, "utf-8")
            .digest("hex");
          const host = answeredUser.hostName;
          if (answer.nsfwedAnswer === true && answer.questioner === null) {
            const title = `⚠️ 이 질문은 NSFW한 질문이에요! #neo-quesdon`;
            const text = `Q: ${question.question}\nA: ${answer.answer}\n#neo-quesdon ${answerUrl}`;
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
            answer.questioner !== null
          ) {
            const title = `Q: ${question.question} #neo-quesdon`;
            const text = `질문자:${answer.questioner}\nA: ${answer.answer}\n#neo-quesdon ${answerUrl}`;
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
            answer.questioner !== null
          ) {
            const title = `⚠️ 이 질문은 NSFW한 질문이에요! #neo-quesdon`;
            const text = `질문자:${answer.questioner}\nQ:${question.question}\nA: ${answer.answer}\n#neo-quesdon ${answerUrl}`;
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
            const title = `Q: ${question.question} #neo-quesdon`;
            const text = `A: ${answer.answer}\n#neo-quesdon ${answerUrl}`;
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
        console.log("Created new answer:", answerUrl);
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
  const cookieStore = await cookies();
  const jwtToken = cookieStore.get("jwtToken")?.value;

  try {
    await verifyToken(jwtToken);

    const prisma = new PrismaClient();

    const deleteQuestion = await prisma.question.delete({
      where: {
        id: id,
      },
    });
  } catch (err) {
    throw new Error(`JWT Token Verification Error: ${err}`);
  }
}
