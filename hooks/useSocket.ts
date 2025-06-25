import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@/lib/types';

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

export const useSocket = () => {
  const socketRef = useRef<SocketType | null>(null);

  useEffect(() => {
    const socketInstance: SocketType = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
      path: '/api/socket',
      addTrailingSlash: false,
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log('Connected to server');
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return socketRef.current;
};