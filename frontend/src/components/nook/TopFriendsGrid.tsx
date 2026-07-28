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
  const friendList = (friends || topFriends || []);

  return (
    <div className="nook-panel">
      <div className="nook-panel-header">
        <Users size={20} />
        <span>{title} ({friendList.length})</span>
      </div>
      {friendList.length === 0 ? (
        <p style={{ opacity: 0.7, fontSize: '0.9rem', fontStyle: 'italic', margin: 0, textAlign: 'center' }}>
          {ownerUsername} hasn't selected any Top Friends yet! 🤝
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.85rem' }}>
          {friendList.slice(0, 12).map((friend) => (
            <Link
              key={friend.id}
              to={`/nook/${friend.username}`}
              style={{
                background: 'rgba(0,0,0,0.25)',
                padding: '0.65rem 0.5rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              <img
                src={friend.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={friend.display_name}
                style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', marginBottom: '0.4rem', border: '2px solid var(--accent-color)' }}
              />
              <span style={{ fontWeight: 700, fontSize: '0.82rem', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {friend.display_name || friend.username}
              </span>
              <span style={{ fontSize: '0.72rem', opacity: 0.65 }}>@{friend.username}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
