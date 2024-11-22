import { PrismaClient } from "@prisma/client";

export class GetPrismaClient {
  private static prismaClient: PrismaClient;
  private constructor() {}
  public static getClient() {
    if (!GetPrismaClient.prismaClient) {
      GetPrismaClient.prismaClient = new PrismaClient({log: ['info']});
    }
    return GetPrismaClient.prismaClient;
  }
}