import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Send, Trash2, Smile } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import { playThemeSound } from '../../utils/themeSoundEngine';

interface Reaction {
  emoji: string;
  count: number;
  user_reacted: boolean;
  users: string[];
}

interface GuestbookEntry {
  id: number;
  content: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  reactions?: Reaction[];
}

interface GuestbookWidgetProps {
  title?: string;
  nookUsername?: string;
  nookOwnerId?: number;
  nookTheme?: string;
  themeSoundsEnabled?: boolean;
}

export const GuestbookWidget: React.FC<GuestbookWidgetProps> = ({
  title = 'Guestbook & Comments',
  nookUsername = 'User',
  nookOwnerId,
  nookTheme,
  themeSoundsEnabled = true
}) => {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePickerEntryId, setActivePickerEntryId] = useState<number | null>(null);

  const isOwner = !!(user && user.username && user.username.toLowerCase() === nookUsername.toLowerCase());

  // Parse user reaction picker options or use defaults
  const reactionOptions: string[] = (() => {
    if (user?.reaction_picker_json) {
      try {
        const parsed = JSON.parse(user.reaction_picker_json);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return ['❤️', '👍', '🔥', '✨', '😂', '🎉', '😮', '🚀'];
  })();

  const defaultReaction = user?.default_reaction || '❤️';

  const loadEntries = () => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`/api/social/guestbook/${nookUsername}`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.entries) setEntries(data.entries);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadEntries();
  }, [nookUsername, token]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !token) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/social/guestbook/${nookUsername}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment })
      });

      const data = await res.json();
      if (res.ok) {
        if (nookTheme) {
          playThemeSound(nookTheme, themeSoundsEnabled !== false, 'guestbook');
        }
        showToast('Guestbook comment posted!', 'success');
        setNewComment('');
        loadEntries();
      } else {
        showToast(data.error || 'Failed to post comment', 'error');
      }
    } catch (err) {
      showToast('Error posting comment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (entryId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/social/guestbook/entry/${entryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Comment deleted', 'info');
        setEntries(prev => prev.filter(e => e.id !== entryId));
      }
    } catch (e) {
      showToast('Failed to delete comment', 'error');
    }
  };

  const handleToggleReaction = async (entryId: number, emoji: string) => {
    if (!token || !isOwner) return;
    setActivePickerEntryId(null);

    try {
      const res = await fetch(`/api/social/guestbook/entry/${entryId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ emoji })
      });
      const data = await res.json();
      if (res.ok) {
        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, reactions: data.reactions } : e));
      } else {
        showToast(data.error || 'Failed to react', 'error');
      }
    } catch (e) {
      showToast('Failed to update reaction', 'error');
    }
  };

  const handleDoubleTap = (entryId: number) => {
    if (!isOwner) return;
    handleToggleReaction(entryId, defaultReaction);
  };

  return (
    <div className="nook-panel">
      <div className="nook-panel-header">
        <MessageSquare size={20} />
        <span>{title} ({entries.length})</span>
      </div>

      {user ? (
        <form onSubmit={handlePostComment} style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder={`Leave a cute message on ${nookUsername}'s Nook...`}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              borderRadius: 'var(--border-radius-btn)',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)'
            }}
          />
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            <Send size={16} />
            <span>Sign</span>
          </button>
        </form>
      ) : (
        <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '1rem', fontStyle: 'italic' }}>
          Log in to sign {nookUsername}'s guestbook!
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {(entries || []).length === 0 ? (
          <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>No guestbook entries yet. Be the first to comment!</p>
        ) : (
          (entries || []).map(entry => (
            <div
              key={entry.id}
              onDoubleClick={() => handleDoubleTap(entry.id)}
              style={{
                display: 'flex',
                gap: '0.75rem',
                background: 'rgba(255,255,255,0.04)',
                padding: '0.75rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}
            >
              <Link to={`/nook/${entry.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <img
                  src={entry.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt={entry.display_name}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                />
              </Link>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link to={`/nook/${entry.username}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 700, fontSize: '0.85rem' }}>
                    {entry.display_name} <span style={{ opacity: 0.5, fontWeight: 400 }}>@{entry.username}</span>
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
                    <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{(() => {
                      if (!entry.created_at) return '';
                      let str = String(entry.created_at).trim();
                      if (!str.endsWith('Z') && !str.includes('+')) {
                        str = str.replace(' ', 'T') + 'Z';
                      }
                      const d = new Date(str);
                      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    })()}</span>
                    
                    {/* Owner Reaction Button */}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => setActivePickerEntryId(activePickerEntryId === entry.id ? null : entry.id)}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7, padding: '2px', display: 'inline-flex', alignItems: 'center' }}
                        title="Add Reaction"
                      >
                        <Smile size={14} />
                      </button>
                    )}

                    {/* Quick Reaction Picker Popover */}
                    {isOwner && activePickerEntryId === entry.id && (
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '100%',
                        zIndex: 999,
                        background: '#1e293b',
                        border: '1px solid var(--border-color)',
                        borderRadius: '20px',
                        padding: '0.3rem 0.5rem',
                        display: 'flex',
                        gap: '0.3rem',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
                      }}>
                        {reactionOptions.map((emoji: string) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(entry.id, emoji)}
                            style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', padding: '2px' }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {user && (user.username === nookUsername || user.username === entry.username) && (
                      <Trash2 size={14} style={{ cursor: 'pointer', opacity: 0.6, color: '#ef4444' }} onClick={() => handleDelete(entry.id)} />
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', marginTop: '0.3rem', lineHeight: 1.4 }}>
                  {entry.content}
                </div>

                {/* Reaction Badges */}
                {entry.reactions && entry.reactions.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    {entry.reactions.map((r: any) => {
                      const usersTooltip = r.users && r.users.length > 0
                        ? `Reacted by: ${r.users.map((u: string) => `@${u}`).join(', ')}`
                        : '';
                      return (
                        <span
                          key={r.emoji}
                          onClick={() => isOwner && handleToggleReaction(entry.id, r.emoji)}
                          title={usersTooltip || (r.user_reacted ? 'Remove reaction' : 'Add reaction')}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '10px',
                            background: r.user_reacted ? 'rgba(99, 102, 241, 0.3)' : 'rgba(0,0,0,0.25)',
                            border: r.user_reacted ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                            cursor: isOwner ? 'pointer' : 'default',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            fontWeight: 600
                          }}
                        >
                          <span>{r.emoji}</span>
                          <span>{r.count}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
