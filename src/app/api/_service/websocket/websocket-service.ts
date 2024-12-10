import { Logger } from '@/utils/logger/Logger';
import { randomUUID, UUID } from 'crypto';
import { IncomingMessage } from 'http';
import { WebSocket } from 'ws';
import { jwtPayloadType } from '../../_utils/jwt/jwtPayloadType';
import RE2 from 're2';
import { verifyToken } from '../../_utils/jwt/verify-jwt';
import { RedisPubSubService } from '@/app/api/_service/redis-pubsub/redis-event.service';
import {
  AnswerDeletedEvPayload,
  QuestionCreatedPayload,
  QuestionDeletedPayload,
  WebsocketAnswerCreatedEvent,
  WebsocketEventPayload,
  WebsocketKeepAliveEvent,
} from '@/app/_dto/websocket-event/websocket-event.dto';
import { AnswerDto } from '@/app/_dto/Answers.dto';
import { GetPrismaClient } from '../../_utils/getPrismaClient/get-prisma-client';
import { RedisKvCacheService } from '../kvCache/redisKvCacheService';
import { blocking } from '@prisma/client';

let instance: WebsocketService;
type ClientList = {
  id: UUID;
  client_ip: string;
  user_handle?: jwtPayloadType['handle'];
  pingInterval: NodeJS.Timeout;
  ws: WebSocket;
}[];
export class WebsocketService {
  private logger = new Logger('WebsocketService');
  private clientList: ClientList = [];
  private constructor() {
    this.onConnect = this.onConnect.bind(this);
    const eventService = RedisPubSubService.getInstance();

    eventService.sub<QuestionCreatedPayload>('question-created-event', (data) => {
      this.logger.debug(`Got Event question-created-even`);
      this.sendToUser<QuestionCreatedPayload>(data.questioneeHandle, {
        ev_name: 'question-created-event',
        data: data,
      });
    });

    eventService.sub<QuestionDeletedPayload>('question-deleted-event', (data) => {
      this.logger.debug(`Got Event question-deleted-event`);
      this.sendToUser<QuestionDeletedPayload>(data.handle, {
        ev_name: 'question-deleted-event',
        data: data,
      });
    });
    eventService.sub<AnswerDto>('answer-created-event', async (data) => {
      this.logger.debug(`Got Event answer-created-event`);
      const ev_data: WebsocketAnswerCreatedEvent = {
        ev_name: 'answer-created-event',
        data: data,
      };
      const filteredClients = await this.filterBlock(this.clientList, data.answeredPersonHandle);
      this.sendToList<AnswerDto>(filteredClients, ev_data);
    });
    eventService.sub<AnswerDeletedEvPayload>('answer-deleted-event', (data) => {
      this.logger.debug(`Got Event answer-deleted-event`);
      this.sendToAll<AnswerDeletedEvPayload>({
        ev_name: 'answer-deleted-event',
        data: {
          deleted_id: data.deleted_id,
        },
      });
    });
  }
  public static getInstance() {
    if (!instance) {
      instance = new WebsocketService();
    }
    return instance;
  }
  async onConnect(ws: WebSocket, req: IncomingMessage) {
    const id = randomUUID();
    const cookie = req.headers.cookie;
    const re = new RE2('(?:jwtToken=)(.+)(?:;)');
    const token = re.match(cookie ?? '')?.[1];
    let tokenBody;
    try {
      tokenBody = await verifyToken(token);
    } catch {}

    const real_ip_header = req.headers['x-forwarded-for'];
    let client_ip: string | undefined;
    if (real_ip_header) {
      if (typeof real_ip_header !== 'string') {
        client_ip = real_ip_header[0]?.split(/\s{0,3},\s{0,3}/).at(-1);
      } else {
        client_ip = real_ip_header.split(/\s{0,3},\s{0,3}/).at(-1);
      }
    }
    if (client_ip === undefined) {
      client_ip = req.socket.remoteAddress ?? '??';
    }
    this.logger.debug(`new Websocket Client ${id} Connected, ip: ${client_ip}`);
    const pingInterval = setInterval(() => {
      const keepAliveData: WebsocketKeepAliveEvent = {
        ev_name: 'keep-alive',
        data: `Ping ${Date.now()}`,
      };
      ws.send(JSON.stringify(keepAliveData));
    }, 10000);
    this.clientList.push({
      id: id,
      client_ip: client_ip,
      ws: ws,
      user_handle: tokenBody?.handle,
      pingInterval: pingInterval,
    });
    const same_ip_list = this.clientList.filter((c) => {
      return c.client_ip === client_ip;
    });
    if (same_ip_list.length > 10) {
      this.logger.log(`같은 ip ${client_ip} 에 Websocket 커넥션이 10개가 넘었습니다. 가장 오래된 연결을 종료합니다`);
      same_ip_list[0].ws.close();
    }

    const helloData: WebsocketKeepAliveEvent = {
      ev_name: 'keep-alive',
      data: `Hello ${id}`,
    };
    ws.send(JSON.stringify(helloData));

    ws.on('close', (_code, _reason) => {
      this.logger.debug('bye', id);
      this.clientList.forEach((c, i) => {
        if (c.id === id) {
          clearInterval(c.pingInterval);
          this.clientList.splice(i, 1);
        }
      });
    });
    ws.on('message', (data, _isBinary) => {
      this.logger.debug(`Client ${id} say`, data.toString());
    });
    ws.on('error', (err) => {
      this.logger.debug(`WS ERROR`, err);
    });
  }
  public sendToUser<T>(handle: string, data: WebsocketEventPayload<T>) {
    this.clientList.forEach((c) => {
      if (c.user_handle === handle) {
        c.ws.send(JSON.stringify(data));
      }
    });
  }
  public sendToAll<T>(data: WebsocketEventPayload<T>) {
    this.clientList.forEach((c) => {
      c.ws.send(JSON.stringify(data));
    });
  }

  private sendToList<T>(list: ClientList, data: WebsocketEventPayload<T>) {
    list.forEach((c) => {
      c.ws.send(JSON.stringify(data));
    });
  }

  private async filterBlock(clients: ClientList, target_handle: string) {
    const prisma = GetPrismaClient.getClient();
    const kv = RedisKvCacheService.getInstance();
    const getBlockListOnlyExist = async (): Promise<blocking[]> => {
      const all_blockList = await prisma.blocking.findMany({ where: { blockerHandle: target_handle, hidden: false } });
      const existList = [];
      for (const block of all_blockList) {
        const exist = await prisma.user.findUnique({
          where: { handle: block.blockeeHandle },
        });
        if (exist) {
          existList.push(block);
        }
      }
      return existList;
    };
    const blockList = await kv.get(getBlockListOnlyExist, { key: `block-${target_handle}`, ttl: 600 });
    const blockedList = await prisma.blocking.findMany({ where: { blockeeHandle: target_handle, hidden: false } });
    const filteredClients = clients.filter((c) => {
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
