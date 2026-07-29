import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Bell, Check, X, UserPlus, MessageSquare, Heart, Sparkles } from 'lucide-react';

export const NotificationDropdown: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'notices' | 'friends'>('notices');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setPendingRequests(data.pendingFriendRequests || []);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [token]);

  // Handle clicking outside popover to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {}
  };

  const handleRespondFriendRequest = async (requestId: number, action: 'accept' | 'reject') => {
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
        setPendingRequests(prev => prev.filter(r => r.request_id !== requestId));
        loadNotifications();
      } else {
        showToast(data.error || 'Action failed', 'error');
      }
    } catch (e) {
      showToast('Error processing request', 'error');
    }
  };

  const totalBadgeCount = unreadCount + pendingRequests.length;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) loadNotifications(); }}
        className="btn-secondary"
        style={{ position: 'relative', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        title="Notifications"
      >
        <Bell size={18} />
        {totalBadgeCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#ef4444',
            color: '#ffffff',
            fontSize: '0.7rem',
            fontWeight: 800,
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
          }}>
            {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
          </span>
        )}
      </button>

      {/* Hover Dropdown Popover */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '340px',
          maxHeight: '440px',
          background: 'rgba(18, 20, 32, 0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header & Tabs */}
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('notices')}
                style={{
                  background: activeTab === 'notices' ? 'var(--accent-color)' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '15px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Notices {unreadCount > 0 && `(${unreadCount})`}
              </button>
              <button
                onClick={() => setActiveTab('friends')}
                style={{
                  background: activeTab === 'friends' ? 'var(--accent-color)' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '15px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
              </button>
            </div>

            {activeTab === 'notices' && unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Mark read
              </button>
            )}
          </div>

          {/* Tab 1: Notices Content */}
          {activeTab === 'notices' && (
            <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
              {(notifications || []).length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', opacity: 0.6, fontSize: '0.85rem' }}>
                  No notifications yet ✨
                </div>
              ) : (
                (notifications || []).map(n => (
                  <div
                    key={n.id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      marginBottom: '0.4rem',
                      background: n.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.12)',
                      borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--accent-color)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '0.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{n.title}</span>
                      <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p style={{ margin: 0, opacity: 0.85, lineHeight: 1.4, fontSize: '0.8rem' }}>{n.message}</p>
                    {n.link_url && (() => {
                      const rawUrl = n.link_url.trim();
                      const isExternal = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('//') || (!rawUrl.startsWith('/') && rawUrl.includes('.'));
                      const finalUrl = isExternal && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://') && !rawUrl.startsWith('//') ? `https://${rawUrl}` : rawUrl;

                      if (isExternal) {
                        return (
                          <a
                            href={finalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setIsOpen(false)}
                            style={{ display: 'inline-block', marginTop: '0.4rem', color: 'var(--accent-color)', fontWeight: 600, fontSize: '0.75rem' }}
                          >
                            {n.link_title ? `${n.link_title} ↗` : 'Open Link ↗'}
                          </a>
                        );
                      }

                      return (
                        <Link
                          to={finalUrl}
                          onClick={() => setIsOpen(false)}
                          style={{ display: 'inline-block', marginTop: '0.4rem', color: 'var(--accent-color)', fontWeight: 600, fontSize: '0.75rem' }}
                        >
                          {n.link_title ? `${n.link_title} →` : 'View →'}
                        </Link>
                      );
                    })()}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Friend Requests Content */}
          {activeTab === 'friends' && (
            <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
              {(pendingRequests || []).length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', opacity: 0.6, fontSize: '0.85rem' }}>
                  No pending friend requests
                </div>
              ) : (
                (pendingRequests || []).map(r => (
                  <div
                    key={r.request_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.04)',
                      marginBottom: '0.5rem',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <img
                      src={r.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={r.username}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.display_name || r.username}
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>@{r.username}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => handleRespondFriendRequest(r.request_id, 'accept')}
                        className="btn-primary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        title="Accept Request"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => handleRespondFriendRequest(r.request_id, 'reject')}
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#ef4444', borderColor: '#ef4444' }}
                        title="Decline Request"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
