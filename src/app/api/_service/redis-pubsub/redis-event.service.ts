import { websocketEventNameType, WebsocketPayloadTypes } from '@/app/_dto/websocket-event/websocket-event.dto';
import { RedisService } from '@/app/api/_service/redisService/redis-service';
import { Logger } from '@/utils/logger/Logger';
import Redis from 'ioredis';

let instance: RedisPubSubService;

export class RedisPubSubService {
  private logger = new Logger('RedisPubSubEvent');
  private pub_redis: Redis;
  private constructor() {
    this.pub_redis = RedisService.getRedis();
  }
  public static getInstance() {
    if (!instance) {
      instance = new RedisPubSubService();
    }
    return instance;
  }
  public async sub<T extends WebsocketPayloadTypes>(
    channel_name: websocketEventNameType,
    onMessage: (data: T) => void,
  ) {
    const sub_redis = RedisService.getRedis();
    sub_redis.subscribe(channel_name);
    sub_redis.on('message', (channel, message) => {
      if (channel === channel_name) {
        this.logger.debug(`Channel ${channel}, message: ${message}`);
        const decodedData = JSON.parse(message) as T;
        onMessage(decodedData);
      }
    });
  }

  public async pub<T extends WebsocketPayloadTypes>(channel_name: websocketEventNameType, data: T) {
    this.pub_redis.publish(channel_name, JSON.stringify(data));
  }
}
