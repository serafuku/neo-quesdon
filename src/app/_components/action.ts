"use server";

import { PrismaClient } from "@prisma/client";

export async function fetchUser(handle: string) {
  const prisma = new PrismaClient();

  const user = await prisma.profile.findUnique({
    where: {
      handle: handle,
    },
  });

  if (user) {
    return user;
  }
}
