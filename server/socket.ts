import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Message, User, ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '@/lib/types';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: ServerIO<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
    };
  };
};

const users = new Map<string, User>();
const messages = new Map<string, Message[]>();
const MAX_MESSAGES_PER_ROOM = 100;
const MAX_ROOMS = 50;

export const initSocket = (server: NetServer) => {
  const io = new ServerIO<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
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
              'http://localhost:8081',
              'http://localhost:19000',
              'http://localhost:19006'
            ];

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
          return callback(null, true);
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log('Origin rejected:', origin);
        }
        
        callback(new Error('Not allowed by CORS'), false);
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6,
    connectTimeout: 45000,
    serveClient: false,
  });

  io.engine.on('connection_error', (err) => {
    console.error('Socket connection error:', {
      code: err.code,
      message: err.message,
      context: err.context?.name || 'unknown'
    });
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id} via ${socket.conn.transport.name}`);
    
    socket.conn.on('upgrade', () => {
      console.log(`Transport upgraded to ${socket.conn.transport.name} for ${socket.id}`);
    });

    // Updated joinRoom handler with UID support
    socket.on('joinRoom', ({ username, room, uid }) => {
      try {
        if (!username?.trim() || !room?.trim()) {
          socket.emit('error', 'Username and room are required');
          return;
        }

        const sanitizedRoom = room.trim().toLowerCase();
        const sanitizedUsername = username.trim();

        console.log(`${sanitizedUsername} (${uid || 'no-uid'}) joining room: ${sanitizedRoom}`);
        
        const user: User = {
          id: socket.id,
          username: sanitizedUsername,
          room: sanitizedRoom,
          uid: uid, // Store UID with user
        };

        // Store UID in socket data for easy access
        socket.data = {
          username: sanitizedUsername,
          room: sanitizedRoom,
          uid: uid,
        };

        // Remove user from previous room if exists
        const existingUser = users.get(socket.id);
        if (existingUser && existingUser.room !== sanitizedRoom) {
          socket.leave(existingUser.room);
          socket.to(existingUser.room).emit('userLeft', existingUser);
          
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

    // Updated sendMessage handler with UID support
    socket.on('sendMessage', ({ text, username, room, uid }) => {
      try {
        if (!text?.trim() || !username?.trim() || !room?.trim()) {
          socket.emit('error', 'Message text, username, and room are required');
          return;
        }

        // Rate limiting check
        const now = Date.now();
        const userKey = `${socket.id}_lastMessage`;
        const lastMessageTime = (socket as any)[userKey] || 0;
        
        if (now - lastMessageTime < 500) {
          socket.emit('error', 'Please wait before sending another message');
          return;
        }
        (socket as any)[userKey] = now;

        const sanitizedText = text.trim().substring(0, 1000);
        const sanitizedRoom = room.trim().toLowerCase();
        const sanitizedUsername = username.trim();
        
        // Get UID from socket data if not provided
        const messageUID = uid || socket.data?.uid;
        
        const message: Message = {
          id: uuidv4(),
          text: sanitizedText,
          username: sanitizedUsername,
          room: sanitizedRoom,
          timestamp: new Date(),
          uid: messageUID, // Include UID in message for ownership tracking
        };

        // Store message with memory management
        if (!messages.has(sanitizedRoom)) {
          if (messages.size >= MAX_ROOMS) {
            socket.emit('error', 'Server capacity reached');
            return;
          }
          messages.set(sanitizedRoom, []);
        }
        
        const roomMessages = messages.get(sanitizedRoom)!;
        roomMessages.push(message);

        if (roomMessages.length > MAX_MESSAGES_PER_ROOM) {
          roomMessages.splice(0, roomMessages.length - MAX_MESSAGES_PER_ROOM);
        }

        // Send message to all users in the room
        io.to(sanitizedRoom).emit('message', message);
        
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Message in ${sanitizedRoom} from ${sanitizedUsername} (${messageUID}): ${sanitizedText.substring(0, 50)}...`);
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
          console.log(`${user.username} (${user.uid}) leaving room: ${user.room}`);
          socket.leave(user.room);
          
          socket.to(user.room).emit('userLeft', user);

          const roomUsers = Array.from(users.values()).filter(u => u.room === user.room && u.id !== socket.id);
          io.to(user.room).emit('roomUsers', roomUsers);
          
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

          const roomUsers = Array.from(users.values()).filter(u => u.room === user.room);
          io.to(user.room).emit('roomUsers', roomUsers);
          
          console.log(`${user.username} (${user.uid}) disconnected from ${user.room} (${reason})`);
        } else {
          console.log(`Unknown user ${socket.id} disconnected (${reason})`);
        }
      } catch (error) {
        console.error('Error in disconnect handler:', error);
      }
    });

    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Cleanup function for memory management
  const cleanup = () => {
    setInterval(() => {
      for (const [room, msgs] of messages.entries()) {
        const hasUsers = Array.from(users.values()).some(user => user.room === room);
        if (!hasUsers && msgs.length === 0) {
          messages.delete(room);
        }
      }
    }, 5 * 60 * 1000);
  };

  cleanup();

  console.log(`Socket.IO server initialized (${process.env.NODE_ENV || 'development'})`);
  
  return io;
};

// Graceful shutdown handler
export const shutdownSocket = (io: ServerIO<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
  console.log('Shutting down Socket.IO server...');
  
  io.emit('error', 'Server is shutting down');
  
  io.close(() => {
    console.log('Socket.IO server closed');
  });
  
  users.clear();
  messages.clear();
};
