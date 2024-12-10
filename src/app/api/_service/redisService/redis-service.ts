import { Logger } from '@/utils/logger/Logger';
import Redis, { RedisOptions } from 'ioredis';

export class RedisService {
  private static logger = new Logger('RedisService');
  private constructor() {}
  public static getRedis(options?: RedisOptions) {
    const host = process.env.REDIS_HOST;
    const port_str = process.env.REDIS_PORT;
    if (typeof host !== 'string' || typeof port_str !== 'string') {
      throw new Error('Redis host or port not provided!');
    }
    const port = Number.parseInt(port_str, 10);
    this.logger.log(`Start redis with ${host}:${port}`);
    return new Redis({
      host: host,
      port: port,
      ...options,
    });
  }
}
