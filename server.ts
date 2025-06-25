import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { initSocket } from './server/socket'; // adjust path if needed

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  
  // Initialize your Socket.IO logic
  initSocket(httpServer);

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`> Ready on http://localhost:${port} (and externally)`);
  });
});
