import { AnswerDeletedEvPayload } from '@/app/_dto/websocket-event/websocket-event.dto';
import { RedisPubSubService } from '@/app/api/_service/redis-pubsub/redis-event.service';
import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const accountDelete = 'AccountDelete';
type dataType = { handle: string };

const logger = new Logger('AccountDeleteWork');

export class AccountDeleteJob {
  private deleteQueue;
  private deleteWorker;
  private redisPubsub: RedisPubSubService;

  constructor(connection: Redis) {
    this.redisPubsub = RedisPubSubService.getInstance();
    this.deleteQueue = new Queue(accountDelete, {
      connection,
    });
    this.deleteWorker = new Worker(accountDelete, this.process.bind(this), {
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
    this.deleteWorker.on('progress', (job) => {
      logger.debug(`${job.name} 처리를 시작합니다. : ${job.data.handle}`);
    });
    this.deleteWorker.on('completed', (job) => {
      logger.debug(`${job.name} 처리가 완료됨!. : ${job.data.handle}`);
    });
  }
  public async addJob(data: dataType) {
    await this.deleteQueue.add(accountDelete, data);
  }

  private async process(job: Job<dataType>) {
    logger.log(`${job.data.handle} 의 계정 삭제를 시작합니다...`);
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
          await prisma.question.deleteMany({ where: { questioneeHandle: job.data.handle } });
          await prisma.following.deleteMany({ where: { followerHandle: job.data.handle } });
          await prisma.blocking.deleteMany({ where: { blockerHandle: job.data.handle } });
          await prisma.notification.deleteMany({ where: { userHandle: job.data.handle } });
          await prisma.profile.delete({ where: { handle: job.data.handle } });
          await prisma.user.delete({ where: { handle: job.data.handle } });
          logger.log(`계정 ${job.data.handle} 가 삭제됨`);
          return `계정 ${job.data.handle} 가 삭제됨`;
        }
        for (const a of parts) {
          await prisma.answer.delete({ where: { id: a.id } });
          await this.redisPubsub.pub<AnswerDeletedEvPayload>('answer-deleted-event', {
            deleted_id: a.id,
          });
        }
        counter += parts.length;
        logger.debug(`답변 ${counter} 개 삭제됨`);
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
