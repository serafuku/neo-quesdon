import { Redis } from 'ioredis';

export class RateLimiterService {
  private redis: Redis;
  private static instance: RateLimiterService;
  private constructor() {
    this.redis = new Redis();
  }
  public static getLimiter() {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  public async limit(key: string, bucket_time: number, req_limit: number) {
    const now = Date.now() / 1000;
    const result = await this.redis.multi()
      .setnx(`lastreset-${key}`, now)
      .incr(key)
      .getex(`lastreset-${key}`, 'EX', bucket_time)
      .expire(key, bucket_time)
      .exec();

    let req_count = result?.[1][1] as number;
    const lastRefilled_str = result?.[2][1] as string;
    if (typeof req_count !== 'number' || typeof lastRefilled_str !== 'string') {
      return true;
    }
    const last_refilled = Number.parseInt(lastRefilled_str);

    console.log(`requestConter`, req_count, '/', req_limit, `bucket-size: ${bucket_time}sec, lastReset: ${last_refilled}`);
    if (now - last_refilled > (bucket_time / req_limit)) {
      const refill_tokens = Math.min(Math.ceil((now - last_refilled) * (req_limit / bucket_time)), req_limit);
      const newCounter = Math.min(req_limit, req_count) - refill_tokens;
      console.log(`토큰 리필:`, refill_tokens);
      await this.redis.multi()
        .setex(`lastreset-${key}`, bucket_time, now)
        .setex(key, bucket_time, newCounter)
        .exec()
      req_count = newCounter;
    }

    if (req_count > req_limit) {
      return false;
    }
    return true;
  }

}