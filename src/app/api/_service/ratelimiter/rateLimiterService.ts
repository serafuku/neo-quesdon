import { Redis } from 'ioredis';
import { Logger } from '@/utils/logger/Logger';
import { RedisService } from '@/app/api/_service/redisService/redis-service';

export class RateLimiterService {
  private redis: Redis;
  private static instance: RateLimiterService;
  private logger: Logger;
  private constructor() {
    this.logger = new Logger('RateLimiterService');
    this.redis = RedisService.getRedis();
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
  public async limit(key: string, option: { bucket_time: number; req_limit: number }) {
    const now = Date.now() / 1000;
    const { bucket_time, req_limit } = option;
    const result = await this.redis
      .multi()
      .setnx(`limit:lastreset-${key}`, now)
      .incr(`limit:${key}`)
      .getex(`limit:lastreset-${key}`, 'EX', bucket_time)
      .expire(`limit:${key}`, bucket_time)
      .exec();

    let req_count = result?.[1][1] as number;
    const lastRefilled_str = result?.[2][1] as string;
    if (typeof req_count !== 'number' || typeof lastRefilled_str !== 'string') {
      // 예외처리
      return true;
    }
    const lastReset = Number.parseInt(lastRefilled_str);

    // 토큰버킷 리필
    if (Math.floor((now - lastReset) * (req_limit / bucket_time)) >= 1) {
      // 리필 토큰수 계산: 마지막 리필이후 지난 초 * 초당 리밋  을 내림한 것
      const refill_tokens = Math.floor((now - lastReset) * (req_limit / bucket_time));

      // 새로운 카운터 값: '현재 카운터와 최대 리퀘스트값 중에 작은것' 에서 리필 토큰수를 뺀 후, 0보다 작으면 0으로 처리
      // '현재 카운터와 최대 리퀘스트값 중에 작은것' 의 이유: 카운터는 리밋에 걸린 이후에도 계속 요청마다 증가하지만, 거부된 요청은 리밋으로 카운트하지 않고 싶음.
      // 0보다 작은경우 0으로 처리하는 이유: 0이 토큰 버킷에서 토큰이 꽉 차있는 상태를 의미하기 때문에, 0보다 작아지면 안됨.
      const newCounter = Math.max(Math.min(req_count, req_limit) - refill_tokens, 0);
      req_count = newCounter;

      await this.redis
        .multi()
        .setex(`limit:lastreset-${key}`, bucket_time, now)
        .setex(`limit:${key}`, bucket_time, newCounter)
        .exec();
    }

    if (req_count > req_limit) {
      this.logger.debug(
        `RateLimited!: requestConter ${req_count} is Higher then Limit ${req_limit} \n`,
        `bucket-size: ${bucket_time}sec, lastReset: ${lastReset}, key: ${key}`,
      );
      // Limit 에 도달함
      return true;
    } else {
      // Limit 에 도달하지 않음
      return false;
    }
  }
}
