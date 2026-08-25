'use server';

import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';

export async function checkMutualFollow(requestHandle: string, targetHandle: string) {
  const prisma = GetPrismaClient.getClient();

  const [forward, backward] = await Promise.all([
    prisma.following.findUnique({
      where: {
        followerHandle_followeeHandle: {
          followerHandle: requestHandle,
          followeeHandle: targetHandle,
        },
      },
    }),
    prisma.following.findUnique({
      where: {
        followerHandle_followeeHandle: {
          followerHandle: targetHandle,
          followeeHandle: requestHandle,
        },
      },
    }),
  ]);

  return !!forward && !!backward;
}
