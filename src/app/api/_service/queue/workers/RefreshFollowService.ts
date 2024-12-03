import { Logger } from '@/utils/logger/Logger';
import { server, user } from '@prisma/client';
import { Job, Queue, UnrecoverableError, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { MisskeyFollowingApiResponse } from '@/api/_misskey-entities/following';
import { createHash } from 'crypto';
import { RedisKvCacheService } from '@/app/api/_service/kvCache/redisKvCacheService';

const RefreshFollowMisskey = 'RefreshFollowMisskey';
const logger = new Logger('RefreshFollow');

export class RefreshFollowWorkerService {
  private queue;
  private workerMisskey;
  constructor(connection: Redis) {
    logger.log('Worker started');
    this.queue = new Queue(RefreshFollowMisskey, {
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
  }

  public async addJob(user: user, instanceType: server['instanceType']) {
    if (instanceType === 'misskey' || instanceType == 'cherrypick') {
      this.queue.add(RefreshFollowMisskey, user, {});
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

      // 10분 이상 지난 레코드는 지난번에 import된 것으로 간주,
      // 이번에 timeStamp가 업데이트 되지 않았다는 것은 언팔로우 했다는 뜻
      const oldTimeStamp = Date.now() - 10 * 60 * 1000;
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
