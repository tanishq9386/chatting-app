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
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
          console.log('Request with no origin (likely mobile app)');
          return callback(null, true);
        }

        // Define allowed origins based on environment
        const allowedOrigins = process.env.NODE_ENV === 'production' 
          ? [
              'https://chatting-app-mj2n.onrender.com',
              'http://chatting-app-mj2n.onrender.com',
            ]
          : [
              'http://localhost:3000',
              'http://127.0.0.1:3000',
              'http://localhost:8081', // Expo dev server
              'http://localhost:19000', // Expo dev server alternative
              'http://localhost:19006', // Expo web
            ];

        // Check if origin is allowed
        if (allowedOrigins.includes(origin)) {
          console.log('Allowed origin:', origin);
          return callback(null, true);
        }

        // For development, allow any localhost origin
        if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
          console.log('Development localhost origin allowed:', origin);
          return callback(null, true);
        }

        console.log('Origin not allowed:', origin);
        callback(new Error('Not allowed by CORS'), false);
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    },
    // Enhanced options for React Native compatibility
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['polling', 'websocket'],
    allowEIO3: true, // Backward compatibility
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6,
  });

  io.engine.on('connection_error', (err) => {
    console.log('Connection error:', err.req);
    console.log('Error code:', err.code);
    console.log('Error message:', err.message);
    console.log('Error context:', err.context);
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    console.log('Transport:', socket.conn.transport.name);
    
    // Log transport upgrades
    socket.conn.on('upgrade', () => {
      console.log('Transport upgraded to:', socket.conn.transport.name);
    });

    socket.on('joinRoom', ({ username, room }) => {
      console.log('User joining room:', { username, room, socketId: socket.id });
      
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
      console.log(`Sent ${roomMessages.length} existing messages to ${username}`);

      // Notify others in the room
      socket.to(room).emit('userJoined', user);

      // Send updated user list to all users in the room
      const roomUsers = Array.from(users.values()).filter(u => u.room === room);
      io.to(room).emit('roomUsers', roomUsers);
      console.log(`Updated user list for room ${room}:`, roomUsers.map(u => u.username));
    });

    socket.on('sendMessage', ({ text, username, room }) => {
      try {
        console.log('Received message:', { text, username, room, socketId: socket.id });
        
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
        const roomMessages = messages.get(room)!;
        roomMessages.push(message);

        // Keep only last 100 messages per room to prevent memory issues
        if (roomMessages.length > 100) {
          roomMessages.splice(0, roomMessages.length - 100);
        }

        // Send message to all users in the room
        io.to(room).emit('message', message);
        console.log(`Message sent to room ${room}:`, message.text.substring(0, 50) + '...');
        
      } catch (err) {
        console.error('Error handling sendMessage:', err);
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('leaveRoom', () => {
      const user = users.get(socket.id);
      if (user) {
        console.log('User leaving room:', { username: user.username, room: user.room });
        socket.leave(user.room);
        
        // Notify others in the room
        socket.to(user.room).emit('userLeft', user);

        // Send updated user list
        const roomUsers = Array.from(users.values()).filter(u => u.room === user.room && u.id !== socket.id);
        io.to(user.room).emit('roomUsers', roomUsers);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('User disconnected:', socket.id, 'Reason:', reason);
      
      const user = users.get(socket.id);
      if (user) {
        users.delete(socket.id);
        socket.to(user.room).emit('userLeft', user);

        // Send updated user list
        const roomUsers = Array.from(users.values()).filter(u => u.room === user.room);
        io.to(user.room).emit('roomUsers', roomUsers);
        
        console.log(`User ${user.username} left room ${user.room}`);
      }
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('Socket error for', socket.id, ':', error);
    });
  });

  // Log server startup
  console.log('Socket.IO server initialized with CORS configuration');
  console.log('Environment:', process.env.NODE_ENV);
  
  return io;
};
