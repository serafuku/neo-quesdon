import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const accountClean = 'AccountClean';
type dataType = { handle: string };

const logger = new Logger('AccountCleanWork');

export class AccountCleanJob {
  private cleanQueue;
  private cleanWorker;

  constructor(connection: Redis) {
    this.cleanQueue = new Queue(accountClean, {
      connection,
    });
    this.cleanWorker = new Worker(accountClean, this.process, {
      connection,
      concurrency: 10,
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 3600,
        count: 1000,
      },
    });
    this.cleanWorker.on('progress', (job) => {
      logger.debug(`${job.name} 처리를 시작합니다. : ${job.data.handle}`);
    });
    this.cleanWorker.on('completed', (job) => {
      logger.debug(`${job.name} 처리가 완료됨!. : ${job.data.handle}`);
    });
  }
  public async addJob(data: dataType) {
    await this.cleanQueue.add(accountClean, data);
  }

  private async process(job: Job<dataType>) {
    logger.debug(`${job.data.handle} 의 답변 청소를 시작합니다...`);
    const prisma = GetPrismaClient.getClient();
    let counter = 0;
    try {
      while (true) {
        const parts = await prisma.answer.findMany({
          where: { answeredPersonHandle: job.data.handle },
          orderBy: { id: 'asc' },
          take: 30,
        });
        if (parts.length === 0) {
          break;
        }
        for (const a of parts) {
          await prisma.answer.delete({ where: { id: a.id } });
        }
        counter += parts.length;
        logger.debug(`${job.data.handle} 의 답변 ${counter} 개가 삭제됨`);
        // wait 1 sec
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, 1000);
        });
      }
    } catch (err) {
      throw err;
    }
  }
}
