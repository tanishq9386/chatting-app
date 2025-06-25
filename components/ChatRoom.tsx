'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Message, User } from '@/lib/types';
import { MessageInput } from './MessageInput';
import { UserList } from './UserList';

interface ChatRoomProps {
  username: string;
  room: string;
}

export const ChatRoom = ({ username, room }: ChatRoomProps) => {
  // Use the improved useSocket hook (see below for how to update)
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Setup and cleanup socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Define event handlers
    const onMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };
    const onRoomMessages = (messages: Message[]) => {
      setMessages(messages);
    };
    const onUserJoined = (user: User) => {
      console.log(`${user.username} joined the room`);
    };
    const onUserLeft = (user: User) => {
      console.log(`${user.username} left the room`);
    };
    const onRoomUsers = (roomUsers: User[]) => {
      setUsers(roomUsers);
    };

    // Join the room
    socket.emit('joinRoom', { username, room });

    // Add listeners
    socket.on('message', onMessage);
    socket.on('roomMessages', onRoomMessages);
    socket.on('userJoined', onUserJoined);
    socket.on('userLeft', onUserLeft);
    socket.on('roomUsers', onRoomUsers);

    // Cleanup on unmount
    return () => {
      socket.off('message', onMessage);
      socket.off('roomMessages', onRoomMessages);
      socket.off('userJoined', onUserJoined);
      socket.off('userLeft', onUserLeft);
      socket.off('roomUsers', onRoomUsers);
    };
  }, [socket, username, room]);

  // Send message function
  const sendMessage = useCallback((text: string) => {
    console.log('Attempting to send message:', text);
    if (socket && text.trim() && isConnected) {
      socket.emit('sendMessage', { text, username, room });
    }
  }, [socket, username, room, isConnected]);

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
        
        <MessageInput onSendMessage={sendMessage} disabled={!isConnected} />
      </div>
      
      <UserList users={users} currentUser={username} />
    </div>
  );
};
