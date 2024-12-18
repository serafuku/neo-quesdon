import { TestLogQueueWorkerService } from '@/_service/queue/workers/TestLogWorkerService';
import { Logger } from '@/utils/logger/Logger';
import { server, user } from '@prisma/client';
import { RefreshFollowWorkerService } from '@/app/api/_service/queue/workers/RefreshFollowService';
import { GetPrismaClient } from '@/api/_utils/getPrismaClient/get-prisma-client';
import { AccountCleanJob } from './workers/AccountClean';
import { ImportBlockQueueService } from '@/app/api/_service/queue/workers/ImportBlock';
import { RedisService } from '@/app/api/_service/redisService/redis-service';
import { ScheduleJobs } from '@/app/api/_service/queue/workers/ScheduleJobs';

export class QueueService {
  private testLogProcess: TestLogQueueWorkerService;
  private followWorker: RefreshFollowWorkerService;
  private accountClean: AccountCleanJob;
  private importBlockService: ImportBlockQueueService;
  private static instance: QueueService;
  private logger = new Logger('QueueService');

  private constructor() {
    const host = process.env.REDIS_HOST ?? '';
    const port = Number.parseInt(process.env.REDIS_PORT ?? '');
    const connection = RedisService.getRedis({ maxRetriesPerRequest: null });
    this.testLogProcess = new TestLogQueueWorkerService(connection);
    this.followWorker = new RefreshFollowWorkerService(connection);
    this.accountClean = new AccountCleanJob(connection);
    this.importBlockService = new ImportBlockQueueService(connection);
    new ScheduleJobs(connection);

    this.logger.log('Queue Service Started ', `redis: ${host}:${port}`);
  }
  public static get() {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  public async addTestLogJob(data: string) {
    await this.testLogProcess.addJob(data);
  }

  public async addRefreshFollowJob(user: user, instanceType: server['instanceType']) {
    const prisma = GetPrismaClient.getClient();
    const profile = await prisma.profile.findUniqueOrThrow({ where: { handle: user.handle } });

    if (Date.now() - profile.lastFollowRefreshed.getTime() > 1 * 60 * 60 * 1000) {
      await this.followWorker.addJob(user, instanceType);
      await prisma.profile.update({
        where: { handle: user.handle },
        data: {
          lastFollowRefreshed: new Date(Date.now()),
        },
      });
    } else {
      this.logger.debug(
        `SKIP refresh follow. reason: Last refresh: ${profile.lastFollowRefreshed}, handle: ${user.handle}`,
      );
    }
  }

  public async addAccountCleanJob(user: user) {
    await this.accountClean.addJob({ handle: user.handle });
  }
  public async addBlockImportJob(user: user) {
    await this.importBlockService.addJob({ userHandle: user.handle });
  }
}
