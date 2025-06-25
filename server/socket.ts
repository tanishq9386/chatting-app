import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Message, User, ServerToClientEvents, ClientToServerEvents } from '@/lib/types';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: ServerIO<ClientToServerEvents, ServerToClientEvents>;
    };
  };
};

const users = new Map<string, User>();
const messages = new Map<string, Message[]>();

export const initSocket = (server: NetServer) => {
  const io = new ServerIO<ClientToServerEvents, ServerToClientEvents>(server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', ({ username, room }) => {
      const user: User = {
        id: socket.id,
        username,
        room,
      };

      users.set(socket.id, user);
      socket.join(room);

      // Send existing messages to the user
      const roomMessages = messages.get(room) || [];
      socket.emit('roomMessages', roomMessages);

      // Notify others in the room
      socket.to(room).emit('userJoined', user);

      // Send updated user list to all users in the room
      const roomUsers = Array.from(users.values()).filter(u => u.room === room);
      io.to(room).emit('roomUsers', roomUsers);
    });

    socket.on('sendMessage', ({ text, username, room }) => {
        console.log('Received message:', text, username, room);
      const message: Message = {
        id: uuidv4(),
        text,
        username,
        room,
        timestamp: new Date(),
      };

      // Store message
      if (!messages.has(room)) {
        messages.set(room, []);
      }
      messages.get(room)!.push(message);

      // Send message to all users in the room
      io.to(room).emit('message', message);
    });

    socket.on('disconnect', () => {
      const user = users.get(socket.id);
      if (user) {
        users.delete(socket.id);
        socket.to(user.room).emit('userLeft', user);

        // Send updated user list
        const roomUsers = Array.from(users.values()).filter(u => u.room === user.room);
        io.to(user.room).emit('roomUsers', roomUsers);
      }
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};