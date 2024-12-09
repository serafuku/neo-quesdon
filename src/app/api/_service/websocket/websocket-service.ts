import { Logger } from '@/utils/logger/Logger';
import { randomUUID, UUID } from 'crypto';
import { IncomingMessage } from 'http';
import { WebSocket } from 'ws';
import { jwtPayloadType } from '../../_utils/jwt/jwtPayloadType';
import RE2 from 're2';
import { verifyToken } from '../../_utils/jwt/verify-jwt';

let instance: WebsocketService;
type ClientList = {
  id: UUID;
  user?: jwtPayloadType['handle'];
  ws: WebSocket;
}[];
export class WebsocketService {
  private logger = new Logger('WebsocketService');
  private clientList: ClientList = [];
  private constructor() {
    this.onConnect = this.onConnect.bind(this);
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
    this.logger.debug(cookie);
    const re = new RE2('(?:jwtToken=)(.+)(?:;)');
    const token = re.match(cookie ?? '')?.[1];
    let tokenBody;
    try {
      tokenBody = await verifyToken(token);
    } catch {}

    this.logger.log(`new Websocket Client ${id} Connected`);
    this.clientList.push({
      id: id,
      ws: ws,
      user: tokenBody?.handle,
    });
    ws.send(`hello! ${id}`);
    this.logger.debug(
      `Client List`,
      this.clientList.map((v) => {
        return { id: v.id, user: v.user };
      }),
    );

    ws.on('close', (_code, _reason) => {
      this.logger.debug('bye', id);
      this.clientList.forEach((c, i) => {
        if (c.id === id) {
          this.clientList.splice(i, 1);
        }
      });
      this.logger.debug(
        `Client List`,
        this.clientList.map((v) => {
          return { id: v.id, user: v.user };
        }),
      );
    });
    ws.on('message', (data, _isBinary) => {
      this.logger.debug(`Client ${id} say`, data.toString());
    });
  }
  public sendToUser(handle: string, data: string) {
    this.clientList.forEach((c) => {
      if (c.user === handle) {
        c.ws.send(data);
      }
    });
  }
  public sendToAll(data: string) {
    this.clientList.forEach((c) => {
      c.ws.send(data);
    });
  }
}
