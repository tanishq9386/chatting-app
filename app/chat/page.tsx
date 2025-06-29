'use client';

import { useState } from 'react';
import { ChatRoom } from '@/components/ChatRoom';

export default function ChatPage() {
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [userUID, setUserUID] = useState('');

  const generateUID = (): string => {
    // Generate unique ID using timestamp + random string
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `user_${timestamp}_${randomPart}`;
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && room.trim()) {
      const uid = generateUID();
      setUserUID(uid);
      setJoined(true);
      
      // Optional: Log for debugging
      console.log('User joining:', { username, room, uid });
    }
  };

  if (joined) {
    return <ChatRoom username={username} room={room} uid={userUID} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center flowing-gradient">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl text-blue-400 font-bold mb-6 text-center">Join Chat Room</h1>
        
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-black text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 text-black border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your username"
              required
              minLength={2}
              maxLength={20}
            />
          </div>
          
          <div>
            <label className="block text-sm text-black font-medium mb-2">Room</label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full p-2 text-black border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter room name"
              required
              minLength={1}
              maxLength={30}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Join Room
          </button>
        </form>
        
        {/* Hidden UID display for debugging (remove in production) */}
        {userUID && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            Session ID: {userUID.substring(0, 16)}...
          </div>
        )}
      </div>
    </div>
  );
}
