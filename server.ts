import { createServer } from 'http';
import next from 'next';
import { initSocket } from './server/socket';

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {  
  const httpServer = createServer((req, res) => handle(req, res));
  
  initSocket(httpServer);
  httpServer.keepAliveTimeout = 120000;
  httpServer.headersTimeout = 120000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`> Ready on http://localhost:${port} (and externally)`);
  });
});

export default {};
