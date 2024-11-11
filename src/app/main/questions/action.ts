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

    if (answeredUser && server) {
      const i = createHash("sha256")
        .update(answeredUser.token + server.appSecret, "utf-8")
        .digest("hex");

      if (answer.nsfwedAnswer === true && answer.questioner === null) {
        await fetch(`https://${answeredUser.hostName}/api/notes/create`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${i}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cw: `⚠️ 이 질문은 NSFW한 질문이에요! #neo-quesdon`,
            text: `Q: ${question.question}\nA: ${answer.answer}`,
          }),
        });
      } else if (answer.nsfwedAnswer === false && answer.questioner !== null) {
        await fetch(`https://${answeredUser.hostName}/api/notes/create`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${i}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cw: `Q: ${question.question} #neo-quesdon`,
            text: `질문자:${answer.questioner}\nA: ${answer.answer}`,
          }),
        });
      } else if (answer.nsfwedAnswer === true && answer.questioner !== null) {
        await fetch(`https://${answeredUser.hostName}/api/notes/create`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${i}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cw: `⚠️ 이 질문은 NSFW한 질문이에요! #neo-quesdon`,
            text: `질문자:${answer.questioner}\nQ:${question.question}\nA: ${answer.answer}`,
          }),
        });
      } else {
        await fetch(`https://${answeredUser.hostName}/api/notes/create`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${i}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cw: `Q: ${question.question} #neo-quesdon`,
            text: `A: ${answer.answer}`,
          }),
        });
      }
    } else {
      console.log("user not found");
    }
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
