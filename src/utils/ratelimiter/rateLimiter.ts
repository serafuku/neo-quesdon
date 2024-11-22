import { Redis } from 'ioredis';

export class RateLimiterService {
  private redis: Redis;
  private static instance: RateLimiterService;
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
  public static getLimiter() {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  /**
   * 리미터 함수.
   * 호출시 리퀘스트 카운터를 자동으로 1증가 시키고 리밋에 도달했는지를 boolean 으로 반환.
   * token-bucket 방식.
   * @param key 리밋을 구분할 키
   * @param option bucket_time: 초 단위 버킷 시간, req_limit: 리밋 숫자
   * @returns boolean (true: 리밋에 도달함, false: 리밋에 도달하지 않음)
   */
  public async limit(key: string, option: {bucket_time: number, req_limit: number}) {
    const now = Date.now() / 1000;
    const {bucket_time, req_limit} = option;
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

    console.debug(`requestConter`, req_count, '/', req_limit, `bucket-size: ${bucket_time}sec, lastReset: ${last_refilled}`);
    if (now - last_refilled > (bucket_time / req_limit)) {
      const refill_tokens = Math.min(Math.ceil((now - last_refilled) * (req_limit / bucket_time)), req_limit);
      const newCounter = Math.min(req_limit, req_count) - refill_tokens;
      console.debug(`토큰 리필:`, refill_tokens);
      await this.redis.multi()
        .setex(`lastreset-${key}`, bucket_time, now)
        .setex(key, bucket_time, newCounter)
        .exec()
      req_count = newCounter;
    }

    if (req_count >= req_limit) {
      return true;
    }
    return false;
  }
}