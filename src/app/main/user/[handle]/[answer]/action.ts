'use server';

import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';

export async function fetchAnswer(id: string) {
  const prisma = GetPrismaClient.getClient();
  const answer = await prisma.answer.findUnique({
    include: { answeredPerson: true },
    where: {
      id: id,
    },
  });

  if (answer) {
    return answer;
  }
}
