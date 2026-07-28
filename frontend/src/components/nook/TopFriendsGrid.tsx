import React from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export interface FriendCard {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  status_message?: string;
  status_emoji?: string;
  top_position?: number;
}

interface TopFriendsGridProps {
  title?: string;
  friends?: FriendCard[];
  topFriends?: FriendCard[];
  ownerUsername?: string;
}

export const TopFriendsGrid: React.FC<TopFriendsGridProps> = ({
  title = 'Top Friends',
  friends,
  topFriends,
  ownerUsername = 'User'
}) => {
  const friendList = friends || topFriends || [];

  return (
    <div className="nook-panel">
      <div className="nook-panel-header">
        <Users size={20} />
        <span>{title} ({friendList.length})</span>
      </div>
      {friendList.length === 0 ? (
        <p style={{ opacity: 0.7, fontSize: '0.9rem', fontStyle: 'italic' }}>
          {ownerUsername} hasn't selected any Top Friends yet!
        </p>
      ) : (
        <div className="top-friends-grid">
          {friends.slice(0, 12).map((friend) => (
            <Link key={friend.id} to={`/nook/${friend.username}`} className="top-friend-card">
              <img
                src={friend.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={friend.display_name}
                className="top-friend-avatar"
              />
              <span style={{ fontWeight: 600, fontSize: '0.85rem', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {friend.display_name}
              </span>
              <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>@{friend.username}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
