import { NextRequest } from 'next/server';
import { initSocket } from '@/server/socket';

export async function GET(req: NextRequest) {
  if (!(global as any).io) {
    console.log('Initializing Socket.io server...');
    const httpServer = (req as any).socket?.server;
    (global as any).io = initSocket(httpServer);
  }

  return new Response('Socket.io server initialized', { status: 200 });
}