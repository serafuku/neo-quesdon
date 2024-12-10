import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { WebsocketService } from '@/app/api/_service/websocket/websocket-service';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();
const dev_server_upgradeHandler = app.getUpgradeHandler();

app.prepare().then(() => {
  if (process.env.NODE_ENV === 'production') {
    const env_arr = ['REDIS_HOST', 'REDIS_PORT', 'WEB_URL', 'DATABASE_URL', 'JWT_SECRET', 'NOTI_TOKEN', 'NOTI_HOST'];
    env_arr.forEach((key) => {
      if (!process.env[key]) {
        throw new Error(`ENV ${key} are not set`);
      }
    });
  }
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });
  const onConnect = WebsocketService.getInstance().onConnect;
  wss.on('connection', onConnect);
  wss.on('error', (err) => {
    console.error('Wss Error!', err);
  });
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/_next/webpack-hmr') {
      wss.handleUpgrade(req, socket, head, (ws_client, request) => {
        wss.emit('connection', ws_client, request);
      });
    } else {
      dev_server_upgradeHandler(req, socket, head);
    }
  });

  server.listen(3000, () => {
    console.log(`> Server listening at http://localhost:${port} as ${dev ? 'development' : process.env.NODE_ENV}`);
  });
});
