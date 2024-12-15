import { Logger } from '@/utils/logger/Logger';
import { server, user } from '@prisma/client';
import { Job, Queue, UnrecoverableError, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { MisskeyFollowingApiResponse } from '@/api/_misskey-entities/following';
import { createHash } from 'crypto';
import { RedisKvCacheService } from '@/app/api/_service/kvCache/redisKvCacheService';
import { MastodonUser } from '@/app/api/_mastodon-entities/user';

const RefreshFollowMisskey = 'RefreshFollowMisskey';
const RefreshFollowMastodon = 'RefreshFollowMastodon';
const logger = new Logger('RefreshFollow');

export class RefreshFollowWorkerService {
  private misskeyQueue;
  private mastodonQueue;
  private workerMisskey;
  private workerMastodon;
  constructor(connection: Redis) {
    logger.log('Worker started');
    this.misskeyQueue = new Queue(RefreshFollowMisskey, {
      connection,
      defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 60 * 1000 } },
    });
    this.workerMisskey = new Worker(RefreshFollowMisskey, this.processMisskey, {
      connection,
      concurrency: 30,
      limiter: {
        max: 20,
        duration: 1000,
      },
      removeOnComplete: { age: 86400, count: 1000 },
      removeOnFail: { age: 86400, count: 1000 },
    });
    this.workerMisskey.on('progress', (job) => {
      logger.debug(`JOB ${job.name} started`);
    });
    this.workerMisskey.on('completed', (job) => {
      logger.debug(`JOB ${job.name} completed!`);
    });

    this.mastodonQueue = new Queue(RefreshFollowMastodon, {
      connection,
      defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 60 * 1000 } },
    });
    this.workerMastodon = new Worker(RefreshFollowMastodon, this.processMastodon, {
      connection,
      concurrency: 30,
      limiter: {
        max: 20,
        duration: 1000,
      },
      removeOnComplete: { age: 86400, count: 1000 },
      removeOnFail: { age: 86400, count: 1000 },
    });
    this.workerMastodon.on('progress', (job) => {
      logger.debug(`JOB ${job.name} started`);
    });
    this.workerMastodon.on('completed', (job) => {
      logger.debug(`JOB ${job.name} completed!`);
    });
  }

  public async addJob(user: user, instanceType: server['instanceType']) {
    if (instanceType === 'misskey' || instanceType == 'cherrypick') {
      this.misskeyQueue.add(RefreshFollowMisskey, user, {});
    } else if (instanceType === 'mastodon') {
      this.mastodonQueue.add(RefreshFollowMastodon, user, {});
    }
  }

  private async processMisskey(job: Job<user>) {
    const prisma = GetPrismaClient.getClient();
    const profile = await prisma.profile.findUnique({ where: { handle: job.data.handle } });
    if (!profile) {
      throw new Error('그런 유저가 없습니다!');
    }
    let cursor: string | undefined;
    let counter = 0;

    const url = `https://${job.data.hostName}/api/users/following`;
    const server = await prisma.server.findUniqueOrThrow({ where: { instances: job.data.hostName } });

    const i = createHash('sha256')
      .update(job.data.token + server.appSecret, 'utf-8')
      .digest('hex');

    try {
      while (true) {
        const body = {
          limit: 100,
          ...(cursor ? { untilId: cursor } : {}),
          i: i,
          userId: job.data.userId,
        };
        const options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', authorization: `Bearer ${i}` },
          body: JSON.stringify(body),
        };
        const response = await fetch(url, options);
        if (response.status === 401 || response.status === 403) {
          throw new UnrecoverableError(`Misskey API returned ${response.status}. ${await response.text()}`);
        } else if (!response.ok) {
          throw new Error(`Misskey API returned Error! ${await response.text()}`);
        }
        const data = (await response.json()) as MisskeyFollowingApiResponse;

        if (data.length === 0) {
          logger.log(`${counter} follow imported`);
          break;
        }

        for (const f of data) {
          const followeeHandle = `@${f.followee.username}@${f.followee.host ?? job.data.hostName}`;
          await prisma.following.upsert({
            where: {
              followerHandle_followeeHandle: {
                followeeHandle: followeeHandle,
                followerHandle: job.data.handle,
              },
            },
            create: {
              followeeHandle: followeeHandle,
              followerHandle: job.data.handle,
            },
            update: {
              createdAt: new Date(),
            },
          });
        }
        cursor = data[data.length - 1].id;
        counter += data.length;
        logger.debug(`Last ID ${cursor}, Processed ${counter} follows...`);
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, 0);
        });
      }

      // 30분 이상 지난 레코드는 지난번에 import된 것으로 간주,
      // 이번에 timeStamp가 업데이트 되지 않았다는 것은 언팔로우 했다는 뜻
      const oldTimeStamp = Date.now() - 30 * 60 * 1000;
      const oldDate = new Date(oldTimeStamp).toISOString();
      const cleaned = await prisma.following.deleteMany({
        where: { followerHandle: job.data.handle, createdAt: { lte: oldDate } },
      });
      logger.log(`Clean ${cleaned.count} old records`);
      const kvCache = RedisKvCacheService.getInstance();
      await kvCache.drop(`follow-${job.data.handle}`);
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }

  private async processMastodon(job: Job<user>) {
    const prisma = GetPrismaClient.getClient();
    const profile = await prisma.profile.findUnique({ where: { handle: job.data.handle } });
    if (!profile) {
      throw new Error('그런 유저가 없습니다!');
    }
    let counter = 0;
    let url = `https://${job.data.hostName}/api/v1/accounts/${job.data.userId}/following?limit=50`;

    try {
      while (true) {
        const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${job.data.token}` } });
        if (res.status === 401) {
          throw new UnrecoverableError(`Mastodon rejects token ${await res.text()}`);
        } else if (res.status === 429) {
          throw new Error(`Mastodon Rate limited! ${await res.text()}`);
        } else if (!res.ok) {
          throw new Error(`Mastodon API call fail! ${await res.text()}`);
        }
        const data = (await res.json()) as MastodonUser[];
        counter += data.length;
        for (const f of data) {
          const followeeDomain = new URL(f.url).hostname;
          const followeeHandle = `@${f.username}@${followeeDomain}`;
          await prisma.following.upsert({
            where: {
              followerHandle_followeeHandle: {
                followeeHandle: followeeHandle,
                followerHandle: job.data.handle,
              },
            },
            create: {
              followeeHandle: followeeHandle,
              followerHandle: job.data.handle,
            },
            update: {
              createdAt: new Date(Date.now()),
            },
          });
        }
        logger.debug(`Processed ${counter} follows...`);

        if (data.length === 0) {
          logger.log(`${counter} follow imported`);
          break;
        }
        const link_header = res.headers.get('link');
        if (!link_header) {
          logger.debug(`Mastodon Server does not give link Header (Maybe End of list)`);
          logger.log(`${counter} follow imported`);
          break;
        }

        const next_url = link_header.match(/(?:<)(https:\/\/.+)(?:>; rel="next")/)?.[1];
        if (!next_url) {
          logger.debug(`Mastodon Server does not give Next URL (End of list)`);
          logger.log(`${counter} follow imported`);
          break;
        }
        url = next_url;
      }

      // 30 분 이상 지난 레코드는 지난번에 import된 것으로 간주,
      // 이번에 timeStamp 가 업데이트 되지 않았다는 것은 언팔로우 했다는 뜻
      const oldTimeStamp = Date.now() - 30 * 60 * 1000;
      const oldDate = new Date(oldTimeStamp).toISOString();
      const cleaned = await prisma.following.deleteMany({
        where: { followerHandle: job.data.handle, createdAt: { lte: oldDate } },
      });
      logger.log(`Clean ${cleaned.count} old records`);
      const kvCache = RedisKvCacheService.getInstance();
      await kvCache.drop(`follow-${job.data.handle}`);
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }
}
