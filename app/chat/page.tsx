'use client';

import { useState } from 'react';
import { ChatRoom } from '@/components/ChatRoom';

export default function ChatPage() {
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && room.trim()) {
      setJoined(true);
    }
  };

  if (joined) {
    return <ChatRoom username={username} room={room} />;
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
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}