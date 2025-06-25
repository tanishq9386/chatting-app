'use client';

import { User } from '@/lib/types';
import { Users } from 'lucide-react';

interface UserListProps {
  users: User[];
  currentUser: string;
}

export const UserList = ({ users, currentUser }: UserListProps) => {
  return (
    <div className="w-64 bg-gray-100 border-l">
      <div className="p-4 border-b bg-blue-300">
        <div className="flex items-center gap-2">
          <Users size={20} />
          <h3 className="font-semibold">Online Users ({users.length})</h3>
        </div>
      </div>
      
      <div className="p-4">
        {users.map((user) => (
          <div
            key={user.id}
            className={`p-2 rounded mb-2 ${
              user.username === currentUser
                ? 'bg-blue-100 border border-blue-300'
                : 'bg-white'
            }`}
          >
            <div className="font-medium">{user.username}</div>
            {user.username === currentUser && (
              <div className="text-xs text-blue-600">You</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};