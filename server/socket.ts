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
const MAX_MESSAGES_PER_ROOM = 100;
const MAX_ROOMS = 50; // Prevent memory leaks from too many rooms

export const initSocket = (server: NetServer) => {
  const io = new ServerIO<ClientToServerEvents, ServerToClientEvents>(server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, server-to-server)
        if (!origin) {
          return callback(null, true);
        }

        // Define allowed origins based on environment
        const allowedOrigins = process.env.NODE_ENV === 'production' 
          ? [
              'https://chatting-app-mj2n.onrender.com',
              'https://chatting-app-mj2n.onrender.com:443',
              'http://chatting-app-mj2n.onrender.com'
            ]
          : [
              'http://localhost:3000',
              'http://127.0.0.1:3000',
              'http://localhost:8081', // Expo dev server
              'http://localhost:19000', // Expo dev server alternative
              'http://localhost:19006'  // Expo web
            ];

        // Check exact match
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // For development, allow any localhost origin
        if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
          return callback(null, true);
        }

        // Log rejected origins in development
        if (process.env.NODE_ENV !== 'production') {
          console.log('Origin rejected:', origin);
        }
        
        callback(new Error('Not allowed by CORS'), false);
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    },
    // Optimized options for production
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6,
    // Additional production optimizations
    connectTimeout: 45000,
    serveClient: false, // Don't serve socket.io client files
  });

  // Connection error handling
  io.engine.on('connection_error', (err) => {
    console.error('Socket connection error:', {
      code: err.code,
      message: err.message,
      context: err.context?.name || 'unknown'
    });
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id} via ${socket.conn.transport.name}`);
    
    // Monitor transport upgrades
    socket.conn.on('upgrade', () => {
      console.log(`Transport upgraded to ${socket.conn.transport.name} for ${socket.id}`);
    });

    socket.on('joinRoom', ({ username, room }) => {
      try {
        // Validate input
        if (!username?.trim() || !room?.trim()) {
          socket.emit('error', 'Username and room are required');
          return;
        }

        // Sanitize room name
        const sanitizedRoom = room.trim().toLowerCase();
        const sanitizedUsername = username.trim();

        console.log(`${sanitizedUsername} joining room: ${sanitizedRoom}`);
        
        const user: User = {
          id: socket.id,
          username: sanitizedUsername,
          room: sanitizedRoom,
        };

        // Remove user from previous room if exists
        const existingUser = users.get(socket.id);
        if (existingUser && existingUser.room !== sanitizedRoom) {
          socket.leave(existingUser.room);
          socket.to(existingUser.room).emit('userLeft', existingUser);
          
          // Update user list for old room
          const oldRoomUsers = Array.from(users.values()).filter(u => u.room === existingUser.room && u.id !== socket.id);
          io.to(existingUser.room).emit('roomUsers', oldRoomUsers);
        }

        users.set(socket.id, user);
        socket.join(sanitizedRoom);

        // Send existing messages to the user
        const roomMessages = messages.get(sanitizedRoom) || [];
        socket.emit('roomMessages', roomMessages);

        // Notify others in the room
        socket.to(sanitizedRoom).emit('userJoined', user);

        // Send updated user list to all users in the room
        const roomUsers = Array.from(users.values()).filter(u => u.room === sanitizedRoom);
        io.to(sanitizedRoom).emit('roomUsers', roomUsers);
        
        console.log(`Room ${sanitizedRoom} now has ${roomUsers.length} users`);
        
      } catch (error) {
        console.error('Error in joinRoom:', error);
        socket.emit('error', 'Failed to join room');
      }
    });

    socket.on('sendMessage', ({ text, username, room }) => {
      try {
        // Validate input
        if (!text?.trim() || !username?.trim() || !room?.trim()) {
          socket.emit('error', 'Message text, username, and room are required');
          return;
        }

        // Rate limiting check (simple implementation)
        const now = Date.now();
        const userKey = `${socket.id}_lastMessage`;
        const lastMessageTime = (socket as any)[userKey] || 0;
        
        if (now - lastMessageTime < 500) { // 500ms rate limit
          socket.emit('error', 'Please wait before sending another message');
          return;
        }
        (socket as any)[userKey] = now;

        const sanitizedText = text.trim().substring(0, 1000); // Limit message length
        const sanitizedRoom = room.trim().toLowerCase();
        const sanitizedUsername = username.trim();
        
        const message: Message = {
          id: uuidv4(),
          text: sanitizedText,
          username: sanitizedUsername,
          room: sanitizedRoom,
          timestamp: new Date(),
        };

        // Store message with memory management
        if (!messages.has(sanitizedRoom)) {
          // Prevent too many rooms from being created
          if (messages.size >= MAX_ROOMS) {
            socket.emit('error', 'Server capacity reached');
            return;
          }
          messages.set(sanitizedRoom, []);
        }
        
        const roomMessages = messages.get(sanitizedRoom)!;
        roomMessages.push(message);

        // Keep only recent messages
        if (roomMessages.length > MAX_MESSAGES_PER_ROOM) {
          roomMessages.splice(0, roomMessages.length - MAX_MESSAGES_PER_ROOM);
        }

        // Send message to all users in the room
        io.to(sanitizedRoom).emit('message', message);
        
        // Log only in development
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Message in ${sanitizedRoom} from ${sanitizedUsername}: ${sanitizedText.substring(0, 50)}...`);
        }
        
      } catch (err) {
        console.error('Error handling sendMessage:', err);
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('leaveRoom', () => {
      try {
        const user = users.get(socket.id);
        if (user) {
          console.log(`${user.username} leaving room: ${user.room}`);
          socket.leave(user.room);
          
          // Notify others in the room
          socket.to(user.room).emit('userLeft', user);

          // Send updated user list
          const roomUsers = Array.from(users.values()).filter(u => u.room === user.room && u.id !== socket.id);
          io.to(user.room).emit('roomUsers', roomUsers);
          
          // Remove user from memory
          users.delete(socket.id);
        }
      } catch (error) {
        console.error('Error in leaveRoom:', error);
      }
    });

    socket.on('disconnect', (reason) => {
      try {
        const user = users.get(socket.id);
        if (user) {
          users.delete(socket.id);
          socket.to(user.room).emit('userLeft', user);

          // Send updated user list
          const roomUsers = Array.from(users.values()).filter(u => u.room === user.room);
          io.to(user.room).emit('roomUsers', roomUsers);
          
          console.log(`${user.username} disconnected from ${user.room} (${reason})`);
        } else {
          console.log(`Unknown user ${socket.id} disconnected (${reason})`);
        }
      } catch (error) {
        console.error('Error in disconnect handler:', error);
      }
    });

    // Handle socket errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Cleanup function for memory management
  const cleanup = () => {
    // Remove empty rooms periodically
    setInterval(() => {
      for (const [room, msgs] of messages.entries()) {
        const hasUsers = Array.from(users.values()).some(user => user.room === room);
        if (!hasUsers && msgs.length === 0) {
          messages.delete(room);
        }
      }
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  };

  cleanup();

  console.log(`Socket.IO server initialized (${process.env.NODE_ENV || 'development'})`);
  
  return io;
};

// Graceful shutdown handler
export const shutdownSocket = (io: ServerIO) => {
  console.log('Shutting down Socket.IO server...');
  
  // Notify all users
  io.emit('error', 'Server is shutting down');
  
  // Close all connections
  io.close(() => {
    console.log('Socket.IO server closed');
  });
  
  // Clear memory
  users.clear();
  messages.clear();
};
