"use server";

import type { typedAnswer } from "@/app";
import { PrismaClient, question } from "@prisma/client";
import { createHash } from "crypto";

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
  answer: typedAnswer,
  hostname: string
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

    const answerUrl = `https://${hostname}/main/user/${answer.answeredPersonHandle}/${postWithAnswer.id}`;

    console.log('Created new answer:', answerUrl);

    if (answeredUser && server) {
      const i = createHash("sha256")
        .update(answeredUser.token + server.appSecret, "utf-8")
        .digest("hex");
      const host = answeredUser.hostName;
      if (answer.nsfwedAnswer === true && answer.questioner === null) {
        const title =  `⚠️ 이 질문은 NSFW한 질문이에요! #neo-quesdon`;
        const text =  `Q: ${question.question}\nA: ${answer.answer}\n#neo-quesdon ${answerUrl}`
        await mkMisskeyNode(i, title, text, host);
      } else if (answer.nsfwedAnswer === false && answer.questioner !== null) {
        const title = `Q: ${question.question} #neo-quesdon`;
        const text = `질문자:${answer.questioner}\nA: ${answer.answer}\n#neo-quesdon ${answerUrl}`;
        await mkMisskeyNode(i, title, text, host);
      } else if (answer.nsfwedAnswer === true && answer.questioner !== null) {
        const title = `⚠️ 이 질문은 NSFW한 질문이에요! #neo-quesdon`;
        const text = `질문자:${answer.questioner}\nQ:${question.question}\nA: ${answer.answer}\n#neo-quesdon ${answerUrl}`;
        await mkMisskeyNode(i, title, text, host);
      } else {
        const title = `Q: ${question.question} #neo-quesdon`;
        const text = `A: ${answer.answer}\n#neo-quesdon ${answerUrl}`;
        await mkMisskeyNode(i, title, text, host);
      }
    } else {
      console.log("user not found");
    }
  }
}

async function mkMisskeyNode(i: string, title: string, text: string, hostname: string) {
  const res = await fetch(`https://${hostname}/api/notes/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${i}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cw: title,
      text: text,
    }),
  });
  if (!res.ok) {
    console.warn(`Note create fail! `, res.status, res.statusText)
  }
}
export async function deleteQuestion(id: number) {
  const prisma = new PrismaClient();

  const deleteQuestion = await prisma.question.delete({
    where: {
      id: id,
    },
  });
}
