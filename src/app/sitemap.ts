import { MetadataRoute } from 'next';
import { GetPrismaClient } from './api/_utils/getPrismaClient/get-prisma-client';

export const dynamic = 'force-dynamic';

const prisma = GetPrismaClient.getClient();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const users = await prisma.profile.findMany();

  return users.map((user) => ({
    url: `${process.env.WEB_URL}/main/user/${user.handle}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
  }));
}
