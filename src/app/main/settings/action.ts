"use server";

import { cookies } from "next/headers";
import { FormValue } from "./page";
import { GetPrismaClient } from "@/utils/getPrismaClient/get-prisma-client";
import { Logger } from "@/utils/logger/Logger";
import { verifyToken } from "@/app/api/functions/web/verify-jwt";

export async function fetchUser() {
  const logger = new Logger('fetchUser');
  const prisma = GetPrismaClient.getClient();
  const cookieStore = await cookies();
  const jwtToken = cookieStore.get("jwtToken")?.value;

  try {
    const payload = await verifyToken(jwtToken);
    const user = await prisma.profile.findUnique({
      where: {
        handle: payload.handle,
      },
    });
    return user;
  } catch (err) {
    logger.error(err);
    return null;
  }
}

export async function updateSetting(handle: string, payload: FormValue) {
  const prisma = GetPrismaClient.getClient();
  const logger = new Logger('updateSetting');

  try {
    const updateUser = prisma.profile
      .update({
        where: {
          handle: handle,
        },
        data: {
          stopAnonQuestion: payload.stopAnonQuestion,
          stopNewQuestion: payload.stopNewQuestion,
          stopNotiNewQuestion: payload.stopNotiNewQuestion,
          stopPostAnswer: payload.stopPostAnswer,
          questionBoxName: `${
            payload.questionBoxName === "" ? "질문함" : payload.questionBoxName
          }`,
        },
      })
      .catch((err) => logger.log(err));
  } catch (err) {
    logger.log(err);
  }
}
