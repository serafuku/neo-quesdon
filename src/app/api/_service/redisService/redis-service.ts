import { Logger } from '@/utils/logger/Logger';
import Redis from 'ioredis';

export class RedisService {
  private static redis: Redis;
  private logger = new Logger('RedisService');
  private constructor() {
    const host = process.env.REDIS_HOST;
    const port_str = process.env.REDIS_PORT;
    if (typeof host !== 'string' || typeof port_str !== 'string') {
      throw new Error('Redis host or port not provided!');
    }
    const port = Number.parseInt(port_str);
    RedisService.redis = new Redis({
      host: host,
      port: port,
    });
    this.logger.log(`Start redis with ${host}:${port}`);
  }
  public static getRedis() {
    if (!RedisService.redis) {
      new RedisService();
    }
    return RedisService.redis;
  }
}
