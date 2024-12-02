import { Logger } from '@/utils/logger/Logger';
import { Redis } from 'ioredis';

export class RedisKvCacheService {
  private static instance: RedisKvCacheService;
  private redis: Redis;
  private logger = new Logger('RedisKvCacheService');
  private constructor() {
    const host = process.env.REDIS_HOST;
    const port_str = process.env.REDIS_PORT;
    if (typeof host !== 'string' || typeof port_str !== 'string') {
      throw new Error('Redis host or port not provided!');
    }
    const port = Number.parseInt(port_str);
    this.redis = new Redis({
      host: host,
      port: port,
    });
  }

  public static getInstance() {
    if (!RedisKvCacheService.instance) {
      RedisKvCacheService.instance = new RedisKvCacheService();
    }
    return RedisKvCacheService.instance;
  }
  public async get<T>(
    fn: () => Promise<T>,
    cacheConfig: { key: string; ttl: number },
    noCache: boolean = false,
  ): Promise<T> {
    const { key, ttl } = cacheConfig;
    const cached_data = await this.redis.get('cache:' + key);
    if (cached_data === null || noCache) {
      const data = await fn();
      const res = await this.redis.setex('cache:' + key, ttl, JSON.stringify(data));
      if (res !== 'OK') {
        this.logger.error('Redis Cache Save Fail!');
        throw new Error('Redis Save Fail');
      }
      this.logger.debug(`Return data without cache (Cache-Miss or Bypass) Key: ${key}`);
      return data;
    } else {
      this.logger.debug(`Return data with cache (Cache-Hit) Key: ${key}`);
      return JSON.parse(cached_data) as T;
    }
  }
}
