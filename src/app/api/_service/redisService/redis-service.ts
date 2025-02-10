import { Logger } from '@/utils/logger/Logger';
import Redis from 'ioredis';

export class RedisService {
  private static logger = new Logger('RedisService');
  private static redis: Redis;
  private static redis_sub: Redis;
  private constructor() {}
  public static getRedis() {
    if (!RedisService.redis) {
      const host = process.env.REDIS_HOST;
      const port_str = process.env.REDIS_PORT;
      if (typeof host !== 'string' || typeof port_str !== 'string') {
        throw new Error('Redis host or port not provided!');
      }
      const port = Number.parseInt(port_str, 10);
      this.logger.log(`Start redis with ${host}:${port}`);
      RedisService.redis = new Redis({
        host: host,
        port: port,
        maxRetriesPerRequest: null,
      });
    }
    return RedisService.redis;
  }
  public static getRedisSub() {
    if (!RedisService.redis_sub) {
      const host = process.env.REDIS_HOST;
      const port_str = process.env.REDIS_PORT;
      if (typeof host !== 'string' || typeof port_str !== 'string') {
        throw new Error('Redis host or port not provided!');
      }
      const port = Number.parseInt(port_str, 10);
      this.logger.log(`Start redis with ${host}:${port}`);
      RedisService.redis_sub = new Redis({
        host: host,
        port: port,
        maxRetriesPerRequest: null,
      });
    }
    return RedisService.redis_sub;
  }
}
