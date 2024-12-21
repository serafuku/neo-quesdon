import { Logger } from '@/utils/logger/Logger';
import { randomUUID, UUID } from 'crypto';
import { IncomingMessage } from 'http';
import { WebSocket } from 'ws';
import { jwtPayloadType } from '../../_utils/jwt/jwtPayloadType';
import RE2 from 're2';
import { verifyToken } from '../../_utils/jwt/verify-jwt';
import { RedisPubSubService } from '@/app/api/_service/redis-pubsub/redis-event.service';
import {
  AnswerCreatedPayload,
  AnswerDeletedEvPayload,
  QuestionCreatedPayload,
  QuestionDeletedPayload,
  WebsocketAnswerCreatedEvent,
  WebsocketEvent,
  WebsocketKeepAliveEvent,
  WebsocketPayloadTypes,
} from '@/app/_dto/websocket-event/websocket-event.dto';
import { GetPrismaClient } from '../../_utils/getPrismaClient/get-prisma-client';
import { RedisKvCacheService } from '../kvCache/redisKvCacheService';
import { blocking, PrismaClient } from '@prisma/client';
import { getIpFromIncomingMessage } from '@/app/api/_utils/getIp/get-ip-from-Request';
import { getIpHash } from '@/app/api/_utils/getIp/get-ip-hash';
import { NotificationPayloadTypes } from '@/app/_dto/notification/notification.dto';

type WsClientType = {
  id: UUID;
  client_ip: string;
  user_handle?: jwtPayloadType['handle'];
  pingInterval?: NodeJS.Timeout;
  lastPongTimeStamp: number;
  ws: WebSocket;
};
type WsClientListType = WsClientType[];
type WsClientKvType = Map<string, WsClientListType>;

export class WebsocketService {
  private static instance: WebsocketService;
  private logger = new Logger('WebsocketService');
  private clientKvMap: WsClientKvType = new Map();
  private prisma: PrismaClient;
  private eventService: RedisPubSubService;
  private constructor() {
    this.onConnect = this.onConnect.bind(this);
    this.eventService = RedisPubSubService.getInstance();
    this.prisma = GetPrismaClient.getClient();

    this.eventService.sub<QuestionCreatedPayload>('question-created-event', (data) => {
      this.logger.debug(`Got Event question-created-even`);
      this.sendToUser<QuestionCreatedPayload>(data.questioneeHandle, {
        ev_name: 'question-created-event',
        data: data,
      });
    });
    this.eventService.sub<QuestionDeletedPayload>('question-deleted-event', (data) => {
      this.logger.debug(`Got Event question-deleted-event`);
      this.sendToUser<QuestionDeletedPayload>(data.handle, {
        ev_name: 'question-deleted-event',
        data: data,
      });
    });
    this.eventService.sub<AnswerCreatedPayload>('answer-created-event', async (data) => {
      this.logger.debug(`Got Event answer-created-event`);
      const ev_data: WebsocketAnswerCreatedEvent = {
        ev_name: 'answer-created-event',
        data: data,
      };
      const filteredClients = await this.filterBlock(data.answeredPersonHandle);
      this.sendToList<AnswerCreatedPayload>(filteredClients, ev_data);
    });
    this.eventService.sub<AnswerDeletedEvPayload>('answer-deleted-event', (data) => {
      this.logger.debug(`Got Event answer-deleted-event`);
      this.sendToAll<AnswerDeletedEvPayload>({
        ev_name: 'answer-deleted-event',
        data: {
          deleted_id: data.deleted_id,
        },
      });
    });
    this.eventService.sub<NotificationPayloadTypes>('websocket-notification-event', (data) => {
      this.logger.debug(`Got Event websocket-notification-event`);
      this.sendToUser<NotificationPayloadTypes>(data.target, {
        ev_name: 'websocket-notification-event',
        data: data,
      });
    });
  }

  public static getInstance() {
    if (!WebsocketService.instance) {
      WebsocketService.instance = new WebsocketService();
    }
    return WebsocketService.instance;
  }

  /**
   * Websocket connect event 핸들러
   */
  async onConnect(ws: WebSocket, req: IncomingMessage) {
    let tokenBody;
    let context: WsClientType;
    try {
      const cookie = req.headers.cookie;
      const re = new RE2('jwtToken=([^;]+);?');
      const token = re.match(cookie ?? '')?.[1];
      tokenBody = await verifyToken(token);
    } catch {}
    const kv_key = tokenBody?.handle ? tokenBody.handle : getIpHash(getIpFromIncomingMessage(req));

    // Set Connection context
    {
      context = {
        id: randomUUID(),
        client_ip: getIpFromIncomingMessage(req),
        pingInterval: undefined,
        lastPongTimeStamp: Date.now(),
        ws: ws,
      };

      const pingInterval = setInterval(() => {
        const keepAliveData: WebsocketKeepAliveEvent = {
          ev_name: 'keep-alive',
          data: `Ping ${Date.now()}`,
        };
        ws.send(JSON.stringify(keepAliveData));
        ws.ping(`Mua ${Date.now()}`);
        if (Date.now() - context.lastPongTimeStamp > 60 * 1000) {
          this.logger.debug(`Ping Timeout! terminate ${context.id}`);
          ws.terminate();
        }
      }, 10000);

      context.pingInterval = pingInterval;
    }

    // clientKvMap 에 저장
    // kev: kv_key, value: wsClient[]
    // kv_key = user_handle or IpHash
    {
      const exist = this.clientKvMap.get(kv_key);
      if (exist) {
        exist.push(context);
        this.logger.debug(`Push exist to client list ${kv_key}, Clients in key: ${exist.length}`);
      } else {
        const newList = [context];
        this.logger.debug(`Make new key ${kv_key}, Clients in key: ${newList.length}`);
        this.clientKvMap.set(kv_key, newList);
      }
      this.checkMaxConnections(kv_key);
    }

    context.ws.on('close', (code) => {
      clearInterval(context.pingInterval);
      const exist = this.clientKvMap.get(kv_key);
      if (!exist) {
        return;
      }
      const connection_id = context.id;
      const idx = exist.findIndex((c) => c.id === connection_id);
      if (idx < 0) {
        return;
      }
      //배열에서 클라이언트 삭제
      exist.splice(idx, 1);
      let deleted = false;
      if (exist.length === 0) {
        deleted = this.clientKvMap.delete(kv_key);
      }
      this.logger.debug(
        `Disconnect ${connection_id}. code: ${code}, key: ${kv_key}, key-deleted: ${deleted}, Remaining Clients from ${kv_key}: ${exist.length}`,
      );
    });

    context.ws.on('pong', () => {
      const exist = this.clientKvMap.get(kv_key);
      if (!exist) {
        return;
      }
      const index = exist.findIndex((c) => c.id === context.id);
      if (index < 0) {
        this.logger.error(`클라이언트 찾을 수 없음! context:`, context);
        return;
      }
      exist[index].lastPongTimeStamp = Date.now();
    });

    context.ws.on('message', (data, isBinary) => {
      if (isBinary) {
        return;
      }
    });

    context.ws.on('error', (err) => {
      this.logger.error(`WS ERROR`, err);
    });

    // for Debug
    this.logger.debug(
      `new Websocket Client ${context.id} Connected, ip: ${context.client_ip} ${tokenBody?.handle ? `as user ${tokenBody.handle}.` : '.'}`,
    );
    const helloData: WebsocketKeepAliveEvent = {
      ev_name: 'keep-alive',
      data: `Hello ${context.id}`,
    };
    context.ws.send(JSON.stringify(helloData));
    const allLists = Array.from(this.clientKvMap.values(), (v) => v);
    const allWsList = allLists.flatMap((v) => v);
    this.logger.debug(`Current Total Websocket connections: `, allWsList.length);
  }

  public sendToUser<T extends WebsocketPayloadTypes>(handle: string, data: WebsocketEvent<T>) {
    const exist = this.clientKvMap.get(handle);
    const stringData = JSON.stringify(data);
    if (!exist) {
      this.logger.debug(`${handle}'s WebSocket connection not found. skip.`);
      return;
    }
    this.logger.debug(`Send to ${handle}'s connections...`);
    exist.forEach((c) => {
      c.ws.send(stringData);
    });
  }

  public sendToAll<T extends WebsocketPayloadTypes>(data: WebsocketEvent<T>) {
    const all_lists = Array.from(this.clientKvMap.values(), (v) => v);
    all_lists.forEach((client_list) => {
      this.sendToList(client_list, data);
    });
  }

  private sendToList<T extends WebsocketPayloadTypes>(list: WsClientListType, data: WebsocketEvent<T>) {
    const stringData = JSON.stringify(data);
    list.forEach((c) => {
      c.ws.send(stringData);
    });
  }

  private checkMaxConnections(kv_key: string) {
    const client_list_at_key = this.clientKvMap.get(kv_key);
    if (!client_list_at_key) {
      return;
    }
    if (client_list_at_key.length > 10) {
      const target = client_list_at_key[0];
      const killTimeout = setTimeout(() => {
        target.ws.terminate();
        this.logger.debug(
          `최대 동시 커넥션 제한을 위해 ${target.id} 커넥션을 close시도했지만 클라이언트 응답하지 않음. terminate 합니다. `,
        );
      }, 5000);

      const onClose = () => {
        clearTimeout(killTimeout);
        this.logger.debug(
          `최대 동시 커넥션 제한을 위해 ${target.id} 커넥션을 close 했습니다. terminate 타이머를 취소합니다.`,
        );
      };

      this.logger.debug(
        `같은 user/ip ${kv_key} 에 Websocket 커넥션이 10개가 넘었습니다. 가장 오래된 연결 ${target.id} 을 종료합니다...`,
      );
      target.ws.addEventListener('close', onClose);
      target.ws.close();
    }
  }

  private async filterBlock(target_handle: string) {
    const redis_kv_cache = RedisKvCacheService.getInstance();
    const all_values = Array.from(this.clientKvMap.values(), (v) => v);
    const client_list = all_values.flatMap((v) => v);
    const getBlockListOnlyExistFunction = async (): Promise<blocking[]> => {
      const all_blockList = await this.prisma.blocking.findMany({
        where: { blockerHandle: target_handle, hidden: false },
      });
      const existList = [];
      for (const block of all_blockList) {
        const exist = await this.prisma.user.findUnique({
          where: { handle: block.blockeeHandle },
        });
        if (exist) {
          existList.push(block);
        }
      }
      return existList;
    };
    const blockList = await redis_kv_cache.get(getBlockListOnlyExistFunction, {
      key: `block-${target_handle}`,
      ttl: 600,
    });
    const blockedList = await this.prisma.blocking.findMany({ where: { blockeeHandle: target_handle, hidden: false } });
    const filteredClients = client_list.filter((c) => {
      if (blockList.find((b) => b.blockeeHandle === c.user_handle)) {
        return false;
      }
      if (blockedList.find((b) => b.blockerHandle === c.user_handle)) {
        return false;
      }
      return true;
    });

    return filteredClients;
  }
}
