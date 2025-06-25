import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@/lib/types';

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

export const useSocket = () => {
  const [socket, setSocket] = useState<SocketType | null>(null);

  useEffect(() => {
    // Connect to the server with the correct path and options
    const socketInstance: SocketType = io(
      process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000',
      {
        path: '/api/socket',
        addTrailingSlash: false,
      }
    );

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Connected to server');
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return socket;
};
