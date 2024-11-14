"use server";

import { PrismaClient } from "@prisma/client";
import type { answers } from "..";
import { cookies } from "next/headers";

export async function fetchCookies(cookie: string) {
  const cookieStore = await cookies();
  const jwtToken = cookieStore.get(cookie);

  if (jwtToken) {
    return jwtToken;
  } else {
    return undefined;
  }
}

export async function fetchMainAnswers(limit?: number, untilId?: string, sinceId?: string) {
  const prisma = new PrismaClient();
  const query_limit = limit ? Math.max(1, Math.min(limit, 100)) : 100;
  const answers: answers[] = await prisma.answer.findMany({
    where: {
      id: {
        ...(sinceId ? { gt: sinceId } : {}),
        ...(untilId ? { lt: untilId } : {}),
      },
    },
    orderBy: {
      id: "asc",
    },
    take: query_limit,
  });

  return answers;
}
