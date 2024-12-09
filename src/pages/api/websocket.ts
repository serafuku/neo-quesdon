import { WebsocketService } from '@/app/api/_service/websocket/websocket-service';
import { Server } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { WebSocketServer } from 'ws';

let _wss: WebSocketServer;
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sock = res.socket as any;
  if (!_wss) {
    const server = sock.server as Server;
    const wsService = WebsocketService.getInstance();
    _wss = new WebSocketServer({ noServer: true });
    _wss.on('connection', wsService.onConnect);
    server.on('upgrade', (req, socket, head) => {
      if (req.url !== '/_next/webpack-hmr') {
        _wss.handleUpgrade(req, socket, head, (ws, req) => {
          _wss.emit('connection', ws, req);
        });
      }
    });
  }

  res.status(200).json({ message: 'Hello from Next.js!' });
}
