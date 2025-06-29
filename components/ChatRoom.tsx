'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Message, User } from '@/lib/types';
import { MessageInput } from './MessageInput';
import { UserList } from './UserList';

interface ChatRoomProps {
  username: string;
  room: string;
  uid: string;
}

export const ChatRoom = ({ username, room, uid }: ChatRoomProps) => {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update connection status
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [isConnected]);

  // Setup and cleanup socket event listeners
  useEffect(() => {
    if (!socket) return;

    console.log('Setting up socket listeners for:', { username, room, uid });

    // Define event handlers
    const onMessage = (message: Message) => {
      console.log('Received message:', message);
      setMessages(prev => {
        // Avoid duplicate messages
        const messageExists = prev.some(m => m.id === message.id);
        if (messageExists) return prev;
        return [...prev, message];
      });
    };

    const onRoomMessages = (messages: Message[]) => {
      console.log('Received room history:', messages.length, 'messages');
      setMessages(messages);
    };

    const onUserJoined = (user: User) => {
      console.log(`${user.username} joined the room`);
    };

    const onUserLeft = (user: User) => {
      console.log(`${user.username} left the room`);
    };

    const onRoomUsers = (roomUsers: User[]) => {
      console.log('Room users updated:', roomUsers.length, 'users');
      setUsers(roomUsers);
    };

    const onConnect = () => {
      console.log('✅ Connected to server');
      setConnectionStatus('connected');
      // Rejoin room on reconnection with UID
      socket.emit('joinRoom', { username, room, uid });
    };

    const onDisconnect = (reason: string) => {
      console.log('❌ Disconnected from server:', reason);
      setConnectionStatus('disconnected');
    };

    const onConnectError = (error: any) => {
      console.error('❌ Connection error:', error);
      setConnectionStatus('disconnected');
    };

    // Join the room immediately with UID
    socket.emit('joinRoom', { username, room, uid });

    // Add listeners
    socket.on('message', onMessage);
    socket.on('roomMessages', onRoomMessages);
    socket.on('userJoined', onUserJoined);
    socket.on('userLeft', onUserLeft);
    socket.on('roomUsers', onRoomUsers);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket listeners');
      socket.off('message', onMessage);
      socket.off('roomMessages', onRoomMessages);
      socket.off('userJoined', onUserJoined);
      socket.off('userLeft', onUserLeft);
      socket.off('roomUsers', onRoomUsers);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      
      // Leave room on unmount
      socket.emit('leaveRoom');
    };
  }, [socket, username, room, uid]);

  // Send message function with UID
  const sendMessage = useCallback((text: string) => {
    console.log('Attempting to send message:', { text, username, room, uid });
    
    if (!socket) {
      console.error('Socket not available');
      return;
    }
    
    if (!text.trim()) {
      console.error('Empty message');
      return;
    }
    
    if (!isConnected) {
      console.error('Not connected to server');
      return;
    }

    // Send message WITH UID for proper message ownership tracking
    socket.emit('sendMessage', { 
      text: text.trim(), 
      username, 
      room,
      uid // Include UID in message
    });
  }, [socket, username, room, uid, isConnected]);

  // Check if message belongs to current user using UID
  const isOwnMessage = (message: Message): boolean => {
    // Use UID if available, fallback to username for backward compatibility
    return message.uid ? message.uid === uid : message.username === username;
  };

  // Get connection status indicator
  const getConnectionIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return <span className="w-2 h-2 bg-green-500 rounded-full"></span>;
      case 'connecting':
        return <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>;
      case 'disconnected':
        return <span className="w-2 h-2 bg-red-500 rounded-full"></span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col">
        {/* Header with connection status */}
        <div className="bg-blue-500 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Room: {room}</h2>
            <p className="text-sm opacity-80">Logged in as: {username}</p>
          </div>
          <div className="flex items-center space-x-2">
            {getConnectionIndicator()}
            <span className="text-sm">
              {connectionStatus === 'connected' ? 'Online' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
            </span>
            <span className="text-xs opacity-60">
              ({users.length} user{users.length !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
        
        {/* Messages area - Updated to use UID-based message ownership */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-100">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-lg">Welcome to room {room}!</p>
              <p className="text-sm">Start a conversation...</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = isOwnMessage(message);
              
              return (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg max-w-xs ${
                    isOwn
                      ? 'bg-blue-500 text-white ml-auto'
                      : 'bg-white text-gray-800 shadow-sm'
                  }`}
                >
                  {!isOwn && (
                    <div className="font-semibold text-sm text-blue-600 mb-1">
                      {message.username}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{message.text}</div>
                  <div className={`text-xs mt-2 ${
                    isOwn ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                  
                  {/* Debug info in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className={`text-xs mt-1 opacity-50 ${
                      isOwn ? 'text-blue-200' : 'text-gray-400'
                    }`}>
                      {message.uid ? `UID: ${message.uid.substring(0, 8)}...` : 'No UID'}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input */}
        <MessageInput 
          onSendMessage={sendMessage} 
          disabled={!isConnected}
          placeholder={
            isConnected 
              ? "Type your message..." 
              : connectionStatus === 'connecting' 
                ? "Connecting..." 
                : "Reconnecting..."
          }
        />
      </div>
      
      {/* User list sidebar */}
      <UserList users={users} currentUserUID={uid} />
    </div>
  );
};
