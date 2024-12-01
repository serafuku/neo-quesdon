import { TestLogQueueWorkerService } from '@/api/_queue-service/processors/TestLogWorkerService';
import { Redis } from 'ioredis';

export class QueueService {
  static instance: QueueService;
  private testLogProcess: TestLogQueueWorkerService;
  private constructor() {
    const host = process.env.REDIS_HOST ?? '';
    const port = Number.parseInt(process.env.REDIS_PORT ?? '');
    const connection = new Redis({ host: host, port: port, maxRetriesPerRequest: null});
    this.testLogProcess = new TestLogQueueWorkerService(connection);
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
}
