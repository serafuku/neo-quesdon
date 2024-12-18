import { GetPrismaClient } from '@/app/api/_utils/getPrismaClient/get-prisma-client';
import { Logger } from '@/utils/logger/Logger';
import { Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

type jobNames = 'CleanOldNotifications';
type jobData = {
  name: jobNames;
  data: unknown;
};

export class ScheduleJobs {
  private scheduleJobsQueue: Queue<jobData, unknown, jobNames>;
  constructor(connection: Redis) {
    this.scheduleJobsQueue = new Queue('ScheduleJobs', {
      connection,
    });
    this.start(connection);
  }
  private async start(connection: Redis) {
    new Worker('ScheduleJobs', timerJobsProcess, {
      connection,
      removeOnComplete: { count: 0 },
      removeOnFail: { age: 3600, count: 1000 },
    });

    this.scheduleJobsQueue.upsertJobScheduler(
      'CleanOldNotifications',
      {
        every: 1000 * 60 * 60,
      },
      {
        name: 'CleanOldNotifications',
        data: { name: 'CleanOldNotifications', data: 'Clean' },
      },
    );
  }
}

async function timerJobsProcess(job: Job<jobData>) {
  switch (job.data.name) {
    case 'CleanOldNotifications':
      cleanOldNotifications(job.data);
      break;
    default:
      break;
  }
}

async function cleanOldNotifications(_data: jobData) {
  const logger = new Logger('cleanOldNotifications');
  const prisma = GetPrismaClient.getClient();
  const max_notifications = 200;
  const clean = async (handle: string) => {
    const notificationIds = await prisma.notification.findMany({
      where: { userHandle: handle },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    if (notificationIds.length > max_notifications) {
      const deleteTargets = notificationIds.slice(max_notifications);
      deleteTargets.forEach(async (t) => {
        await prisma.notification.delete({ where: { id: t.id } });
      });
      logger.debug(`${_data.name}. ${deleteTargets.length} notifications cleaned (${handle})`);
    }
  };
  const countsPerUser = await prisma.notification.groupBy({ by: 'userHandle', _count: { _all: true } });
  countsPerUser.forEach(async (v) => {
    if (v._count._all > max_notifications) {
      try {
        await clean(v.userHandle);
      } catch (err) {
        logger.warn(err);
      }
    }
  });

  // 60일
  const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60);
  const result = await prisma.notification.deleteMany({ where: { createdAt: { lte: oldDate } } });
  logger.debug(`${result.count} notifications cleaned`);
}
