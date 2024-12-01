import { Logger } from '@/utils/logger/Logger';
import { Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { GetPrismaClient } from '../../_utils/getPrismaClient/get-prisma-client';

const TEST_LOG_QUEUE = 'testLogQueue';

export class TestLogQueueWorkerService {
  private logger = new Logger('TestLogQueueWorker');
  private testLogQueue;
  private testLogWorker;
  constructor(connection: Redis) {
    this.testLogQueue = new Queue(TEST_LOG_QUEUE, {
      connection,
    });
    this.testLogWorker = new Worker(TEST_LOG_QUEUE, this.process, {
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
      useWorkerThreads: true,
    });
    this.testLogWorker.on('progress', (job) => {
      this.logger.log(`${job.name} 처리를 시작합니다. data: ${job.data}`);
    });
    this.testLogWorker.on('completed', (job) => {
      this.logger.log(`${job.name} 처리가 완료됨!. data: ${job.data}`);
    });
  }

  public async addJob(data_str: string) {
    await this.testLogQueue.add('TestLogJob', data_str);
  }

  private async process(job: Job<string>) {
    for (let i = 0; i < 10; i++) {
      const prisma = GetPrismaClient.getClient();
      const u = await prisma.user.findFirst();
      console.log(`test... ${job.data}, ${i * 10}%, ${u?.handle}`);
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 100);
      });
    }
  }
}
