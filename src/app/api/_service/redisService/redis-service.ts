import { Logger } from '@/utils/logger/Logger';
import Redis from 'ioredis';

const host = process.env.REDIS_HOST;
const port_str = process.env.REDIS_PORT;
if (typeof host !== 'string' || typeof port_str !== 'string') {
  throw new Error('Redis host or port not provided!');
}
const port = Number.parseInt(port_str);
const logger = new Logger('RedisService');

export class RedisService {
  private static redis: Redis;
  private constructor() {}
  public static getRedis() {
    logger.log(`Start redis with ${host}:${port}`);
    return new Redis({
      host: host,
      port: port,
      maxRetriesPerRequest: null,
    });
  }
}
