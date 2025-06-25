'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Message, User } from '@/lib/types';
import { MessageInput } from './MessageInput';
import { UserList } from './UserList';

interface ChatRoomProps {
  username: string;
  room: string;
}

export const ChatRoom = ({ username, room }: ChatRoomProps) => {
  const socket = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('Socket:', socket);
    if (!socket) return;

    socket.emit('joinRoom', { username, room });

    socket.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('userJoined', (user: User) => {
      console.log(`${user.username} joined the room`);
    });

    socket.on('userLeft', (user: User) => {
      console.log(`${user.username} left the room`);
    });

    socket.on('roomUsers', (roomUsers: User[]) => {
      setUsers(roomUsers);
    });

    return () => {
      socket.off('message');
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('roomUsers');
    };
  }, [socket, username, room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  

  const sendMessage = (text: string) => {
    console.log('Attempting to send message:', text);
    if (socket && text.trim()) {
      socket.emit('sendMessage', { text, username, room });
    }
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col">
        <div className="bg-blue-500 text-white p-4">
          <h2 className="text-xl font-bold">Room: {room}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-200">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg max-w-xs ${
                message.username === username
                  ? 'bg-blue-500 text-white ml-auto'
                  : 'bg-gray-300 text-gray-800'
              }`}
            >
              <div className="font-semibold text-sm">{message.username}</div>
              <div>{message.text}</div>
              <div className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <MessageInput onSendMessage={sendMessage} />
      </div>
      
      <UserList users={users} currentUser={username} />
    </div>
  );
};