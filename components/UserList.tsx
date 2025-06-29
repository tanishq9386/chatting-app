'use client';

import { User } from '@/lib/types';
import { Users } from 'lucide-react';

interface UserListProps {
  users: User[];
  currentUserUID: string;
}

export const UserList = ({ users, currentUserUID }: UserListProps) => {
  return (
    <div className="w-64 bg-gray-100 border-l">
      <div className="p-4 py-4.5 border-b bg-gray-600">
        <div className="flex items-center gap-2">
          <Users size={20} />
          <h3 className="font-semibold">Online Users ({users.length})</h3>
        </div>
      </div>
      
      <div className="p-4">
        {users.map((user) => {
          // Use UID for comparison instead of username
          const isCurrentUser = user.uid === currentUserUID;
          
          return (
            <div
              key={user.id}
              className={`p-2 rounded mb-2 text-gray-600 ${
                isCurrentUser
                  ? 'bg-blue-100 border border-blue-300'
                  : 'bg-white'
              }`}
            >
              <div className="font-medium">{user.username}</div>
              {isCurrentUser && (
                <div className="text-xs text-blue-600">You</div>
              )}
              
              {/* Debug info in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-400 mt-1">
                  UID: {user.uid?.substring(0, 8) || 'no-uid'}...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
