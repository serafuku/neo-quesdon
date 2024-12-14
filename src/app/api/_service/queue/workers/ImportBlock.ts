import { Logger } from '@/utils/logger/Logger';
import { Job, Queue, UnrecoverableError, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { server, user } from '@prisma/client';
import { createHash } from 'crypto';
import { MisskeyBlockingApiResponse } from '@/app/api/_misskey-entities/blocking';
import { RedisKvCacheService } from '@/app/api/_service/kvCache/redisKvCacheService';
import { MastodonUser } from '@/app/api/_mastodon-entities/user';
import { BlockingService } from '@/_service/blocking/blocking-service';

const IMPORT_BLOCK = 'importBlock';

type importBlockType = {
  userHandle: user['handle'];
};

const logger = new Logger('importBlock');

export class ImportBlockQueueService {
  private importQueue;
  private importWorker;
  constructor(connection: Redis) {
    this.importQueue = new Queue<importBlockType>(IMPORT_BLOCK, {
      connection,
    });
    this.importWorker = new Worker<importBlockType>(IMPORT_BLOCK, process, {
      connection,
      concurrency: 10,
      removeOnComplete: {
        age: 86400,
        count: 1000,
      },
      removeOnFail: {
        age: 86400,
        count: 1000,
      },
      useWorkerThreads: true,
    });
    this.importWorker.on('progress', (job) => {
      logger.debug(`${job.name} 처리를 시작합니다. data: ${JSON.stringify(job.data.userHandle)}`);
    });
    this.importWorker.on('completed', (job) => {
      logger.debug(`${job.name} 처리가 완료됨!. data: ${JSON.stringify(job.data.userHandle)}`);
    });
  }

  public async addJob(data: importBlockType) {
    await this.importQueue.add(IMPORT_BLOCK, data);
  }
}

async function process(job: Job<importBlockType>) {
  const prisma = GetPrismaClient.getClient();
  const blockingService = BlockingService.get();
  const userHandle = job.data.userHandle;
  let user: user;
  let server: server;
  try {
    user = await prisma.user.findUniqueOrThrow({ where: { handle: userHandle } });
    server = await prisma.server.findUniqueOrThrow({ where: { instances: user.hostName } });
  } catch (err) {
    logger.error(err);
    throw new UnrecoverableError(`Error ${JSON.stringify(err)}`);
  }
  // 이전에 import되었던 것의 createdAt 시간을 과거로 설정해서 아래의 clean이 돌 수 있도록 하는 꼼수
  await prisma.blocking.updateMany({
    where: { blockerHandle: user.handle, imported: true },
    data: { createdAt: new Date(0) },
  });

  switch (server.instanceType) {
    case 'misskey':
    case 'cherrypick': {
      let cursor: string | undefined;
      let counter = 0;
      const i = createHash('sha256')
        .update(user.token + server.appSecret, 'utf-8')
        .digest('hex');

      const url = `https://${user.hostName}/api/blocking/list`;
      while (true) {
        const body = {
          limit: 100,
          ...(cursor ? { untilId: cursor } : {}),
          i: i,
        };
        const options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', authorization: `Bearer ${i}` },
          body: JSON.stringify(body),
        };

        const res = await fetch(url, options);
        if (res.status === 401 || res.status === 403) {
          throw new UnrecoverableError(`Misskey API returned ${res.status}. ${await res.text()}`);
        } else if (!res.ok) {
          throw new Error(`Misskey API returned Error! ${await res.text()}`);
        }
        const data = (await res.json()) as MisskeyBlockingApiResponse;

        if (data.length === 0) {
          logger.log(`${counter} Block imported from ${server.instanceType}`);
          break;
        }
        counter += data.length;
        cursor = data[data.length - 1].id;

        for (const b of data) {
          const blockeeHandle = `@${b.blockee.username}@${b.blockee.host ?? user.hostName}`;
          await blockingService.createBlock(blockeeHandle, userHandle, true, false);
        }
        logger.debug(`${counter} Block imported`);
      }

      // 30분 이상 지난 레코드는 지난번에 import된 것으로 간주,
      // 이번에 timeStamp가 업데이트 되지 않았다는 것은 블락을 해제했다는 뜻
      const oldTimeStamp = Date.now() - 30 * 60 * 1000;
      const oldDate = new Date(oldTimeStamp).toISOString();
      const cleaned = await prisma.blocking.deleteMany({
        where: { blockerHandle: user.handle, hidden: false, imported: true, createdAt: { lte: oldDate } },
      });
      logger.log(`Clean ${cleaned.count} old records`);
      const kvCache = RedisKvCacheService.getInstance();
      await kvCache.drop(`block-${user.handle}`);
      return `${user.handle} 의 블락 ${counter} 개를 가져왔습니다.`;
    }

    case 'mastodon': {
      let counter = 0;
      let url = `https://${user.hostName}/api/v1/blocks?limit=50`;
      while (true) {
        const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${user.token}` } });
        if (res.status === 401) {
          throw new UnrecoverableError(`Mastodon rejects token ${await res.text()}`);
        } else if (res.status === 429) {
          throw new Error(`Mastodon Rate limited! ${await res.text()}`);
        } else if (!res.ok) {
          throw new Error(`Mastodon API call fail! ${await res.text()}`);
        }
        const data = (await res.json()) as MastodonUser[];
        counter += data.length;

        for (const b of data) {
          const blockeeDomain = new URL(b.url).hostname;
          const blockeeHandle = `@${b.username}@${blockeeDomain}`;
          await blockingService.createBlock(blockeeHandle, userHandle, true, false);
        }
        logger.debug(`Processed ${counter} blocks...`);

        const link_header = res.headers.get('link');
        if (!link_header) {
          throw new UnrecoverableError(`Mastodon Server does not give Next header`);
        }
        const next_url = link_header.match(/(?:<)(https:\/\/.+)(?:>; rel="next")/)?.[1];
        if (!next_url) {
          logger.debug(`Mastodon Server does not give Next URL (End of list)`);
          logger.log(`${counter} block imported from mastodon`);
          break;
        }
        url = next_url;
      }

      // 30 분 이상 지난 레코드는 지난번에 import된 것으로 간주,
      // 이번에 timeStamp 가 업데이트 되지 않았다는 것은 블락을 해제 했다는 뜻
      const oldTimeStamp = Date.now() - 30 * 60 * 1000;
      const oldDate = new Date(oldTimeStamp).toISOString();
      const cleaned = await prisma.blocking.deleteMany({
        where: { blockerHandle: user.handle, hidden: false, createdAt: { lte: oldDate }, imported: true },
      });
      logger.log(`Clean ${cleaned.count} old records`);
      const kvCache = RedisKvCacheService.getInstance();
      await kvCache.drop(`block-${user.handle}`);
      return `${user.handle} 의 블락 ${counter} 개를 가져왔습니다.`;
    }
  }
}
