import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { WebsocketService } from '@/app/api/_service/websocket/websocket-service';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
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
    }
  });

  server.listen(3000, () => {
    console.log(`> Server listening at http://localhost:${port} as ${dev ? 'development' : process.env.NODE_ENV}`);
  });
});
