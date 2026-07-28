import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Users, UserPlus, Star, Check, X, Trash2, Search, Heart, Sparkles } from 'lucide-react';

export const FriendsPage: React.FC = () => {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [friends, setFriends] = useState<any[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<any[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<any[]>([]);
  const [targetUsername, setTargetUsername] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadFriendsData = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/friends/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setFriends(data.friends || []);
        setPendingIncoming(data.pendingIncoming || []);
        setPendingOutgoing(data.pendingOutgoing || []);
      }
    } catch (e) {
      showToast('Error loading friends list', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFriendsData();
  }, [token]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername || !token) return;

    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: targetUsername })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        setTargetUsername('');
        loadFriendsData();
      } else {
        showToast(data.error || 'Failed to send request', 'error');
      }
    } catch (e) {
      showToast('Error sending friend request', 'error');
    }
  };

  const handleRespondRequest = async (requestId: number, action: 'accept' | 'reject') => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/respond-friend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ request_id: requestId, action })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        loadFriendsData();
      } else {
        showToast(data.error || 'Action failed', 'error');
      }
    } catch (e) {
      showToast('Error responding to request', 'error');
    }
  };

  const handleToggleFavorite = async (friendshipId: number, currentFav: boolean) => {
    if (!token) return;
    const updatedFavorites = friends.map(f => {
      if (f.friendship_id === friendshipId) {
        return { friendship_id: f.friendship_id, is_favorite: !currentFav, top_position: !currentFav ? 1 : 0 };
      }
      return { friendship_id: f.friendship_id, is_favorite: !!f.is_favorite, top_position: f.top_position || 0 };
    });

    try {
      const res = await fetch('/api/friends/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ favorites: updatedFavorites })
      });
      if (res.ok) {
        showToast(currentFav ? 'Removed from Top Friends' : 'Added to Top Friends ⭐', 'success');
        loadFriendsData();
      }
    } catch (e) {
      showToast('Error updating Top Friends', 'error');
    }
  };

  const handleRemoveFriend = async (friendshipId: number, friendName: string) => {
    if (!token || !window.confirm(`Are you sure you want to remove @${friendName} from your friends?`)) return;
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Friend removed', 'info');
        loadFriendsData();
      }
    } catch (e) {
      showToast('Failed to remove friend', 'error');
    }
  };

  const filteredFriends = friends.filter(f =>
    f.username.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (f.display_name && f.display_name.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const topFriendsCount = friends.filter(f => f.is_favorite).length;

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={28} color="var(--accent-color)" />
            <span>Friends & Connections</span>
          </h1>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Manage your friends list and pick your Top Friends for your Nook profile grid.</p>
        </div>

        {/* Send Friend Request Form */}
        <form onSubmit={handleSendRequest} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Enter @username handle..."
            value={targetUsername}
            onChange={e => setTargetUsername(e.target.value)}
            style={{ padding: '0.55rem 0.85rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserPlus size={16} />
            <span>Add Friend</span>
          </button>
        </form>
      </div>

      {/* Pending Incoming Invitations Panel */}
      {pendingIncoming.length > 0 && (
        <div className="nook-panel" style={{ marginBottom: '1.5rem', border: '1px solid var(--accent-color)' }}>
          <div className="nook-panel-header" style={{ color: 'var(--accent-color)' }}>
            <UserPlus size={20} />
            <span>Pending Friend Invitations ({pendingIncoming.length})</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {pendingIncoming.map(req => (
              <div key={req.request_id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <img
                  src={req.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt={req.username}
                  style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{req.display_name || req.username}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>@{req.username}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button onClick={() => handleRespondRequest(req.request_id, 'accept')} className="btn-primary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}>
                    <Check size={14} />
                  </button>
                  <button onClick={() => handleRespondRequest(req.request_id, 'reject')} className="btn-secondary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef4444' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Friends List */}
      <div className="nook-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="nook-panel-header" style={{ marginBottom: 0 }}>
            <Heart size={20} color="var(--accent-color)" />
            <span>My Friends List ({friends.length})</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.7, marginLeft: '0.5rem' }}>({topFriendsCount} Favorited in Top Friends)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.75rem', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
            <Search size={14} style={{ opacity: 0.6 }} />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none', width: '130px' }}
            />
          </div>
        </div>

        {filteredFriends.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.7 }}>
            <Users size={36} color="var(--accent-color)" style={{ margin: '0 auto 0.5rem' }} />
            <p>No friends found matching your search. Add friends using their @username above!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {filteredFriends.map(f => (
              <div
                key={f.friendship_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  background: f.is_favorite ? 'rgba(99, 102, 241, 0.12)' : 'rgba(0,0,0,0.2)',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  border: f.is_favorite ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                  position: 'relative'
                }}
              >
                <img
                  src={f.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt={f.username}
                  style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                />

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                    <Link to={`/nook/${f.username}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {f.display_name || f.username}
                    </Link>
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ opacity: 0.6 }}>@{f.username}</span>
                    {f.favorited_you ? (
                      <span style={{ fontSize: '0.68rem', background: 'rgba(234, 179, 8, 0.18)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.4)', padding: '0.1rem 0.4rem', borderRadius: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} title="This friend added you to their Top Friends grid!">
                        <Sparkles size={10} /> Favorited You
                      </span>
                    ) : null}
                  </div>
                  {f.status_message && (
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.status_message}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  {/* Top Friends Favorite Star Toggle */}
                  <button
                    onClick={() => handleToggleFavorite(f.friendship_id, !!f.is_favorite)}
                    className={f.is_favorite ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '0.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title={f.is_favorite ? 'Remove from Top Friends Grid' : 'Add to Top Friends Grid ⭐'}
                  >
                    <Star size={16} fill={f.is_favorite ? '#ffffff' : 'none'} />
                  </button>

                  <button
                    onClick={() => handleRemoveFriend(f.friendship_id, f.username)}
                    className="btn-secondary"
                    style={{ padding: '0.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', borderColor: '#ef4444' }}
                    title="Remove Friend"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
