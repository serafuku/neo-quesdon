"use server";

import { jwtVerify, JWTVerifyResult } from "jose";
import { cookies } from "next/headers";
import { FormValue } from "./page";
import { GetPrismaClient } from "@/utils/getPrismaClient/get-prisma-client";

export async function fetchUser() {
  const prisma = GetPrismaClient.getClient();
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const cookieStore = await cookies();
  const jwtToken = cookieStore.get("jwtToken");
  

  try {
    if (jwtToken) {
      const { payload } = (await jwtVerify(jwtToken.value, secret, {
        issuer: `${process.env.WEB_URL}`,
        audience: "urn:example:audience",
      })) as JWTVerifyResult<{ handle: string; server: string }>;

      const user = await prisma.profile.findUnique({
        where: {
          handle: payload.handle,
        },
      });

      return user;
    } else {
      throw new Error("jwtToken parsing error");
    }
  } catch (err) {
    console.log(err);
  }
}

export async function updateSetting(handle: string, payload: FormValue) {
  const prisma = GetPrismaClient.getClient();

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
      .catch((err) => console.log(err));
  } catch (err) {
    console.log(err);
  }
}
