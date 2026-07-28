import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import { playThemeSound } from '../../utils/themeSoundEngine';

interface GuestbookEntry {
  id: number;
  content: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface GuestbookWidgetProps {
  title?: string;
  nookUsername?: string;
  nookOwnerId?: number;
}

export const GuestbookWidget: React.FC<GuestbookWidgetProps> = ({
  title = 'Guestbook & Comments',
  nookUsername = 'User',
  nookOwnerId
}) => {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadEntries = () => {
    fetch(`/api/social/guestbook/${nookUsername}`)
      .then(res => res.json())
      .then(data => {
        if (data.entries) setEntries(data.entries);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadEntries();
  }, [nookUsername]);

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
        playThemeSound('win9x', true, 'guestbook');
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
        {entries.length === 0 ? (
          <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>No guestbook entries yet. Be the first to comment!</p>
        ) : (
          entries.map(entry => (
            <div key={entry.id} style={{ display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.04)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <img
                src={entry.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={entry.display_name}
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{entry.display_name} <span style={{ opacity: 0.5, fontWeight: 400 }}>@{entry.username}</span></span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{new Date(entry.created_at).toLocaleDateString()}</span>
                    {user && (user.username === nookUsername || user.username === entry.username) && (
                      <Trash2 size={14} style={{ cursor: 'pointer', opacity: 0.6, color: '#ef4444' }} onClick={() => handleDelete(entry.id)} />
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.3rem', lineHeight: 1.4 }}>{entry.content}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
