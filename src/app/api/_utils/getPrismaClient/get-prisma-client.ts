import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prismaClient: PrismaClient };
export class GetPrismaClient {
  private static prismaClient: PrismaClient;
  private constructor() {}
  public static getClient() {
    if (process.env.NODE_ENV !== 'production') {
      if (!globalForPrisma.prismaClient) {
        globalForPrisma.prismaClient = new PrismaClient({ log: ['info'] });
      }
      return globalForPrisma.prismaClient;
    } else {
      if (!GetPrismaClient.prismaClient) {
        GetPrismaClient.prismaClient = new PrismaClient({ log: ['info'] });
      }
      return GetPrismaClient.prismaClient;
    }
  }
}
