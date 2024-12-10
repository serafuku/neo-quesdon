import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient;
export class GetPrismaClient {
  private constructor() {}
  public static getClient() {
    if (!prismaClient) {
      prismaClient = new PrismaClient({ log: ['info'] });
    }
    return prismaClient;
  }
}
