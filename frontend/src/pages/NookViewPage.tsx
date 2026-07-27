import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TopFriendsGrid } from '../components/nook/TopFriendsGrid';
import { MusicPlayerWidget } from '../components/nook/MusicPlayerWidget';
import { SpotifyWidget } from '../components/nook/SpotifyWidget';
import { SteamWidget } from '../components/nook/SteamWidget';
import { GuestbookWidget } from '../components/nook/GuestbookWidget';
import { StickerCanvas } from '../components/nook/StickerCanvas';
import { ShieldAlert, UserPlus, Heart, Sparkles, Edit3 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const NookViewPage: React.FC = () => {
  const { username } = useParams<{ username?: string }>();
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const targetUsername = username || user?.username || 'admin';
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = () => {
    setIsLoading(true);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`/api/nook/profile/${targetUsername}`, { headers })
      .then(res => res.json())
      .then(data => {
        setProfileData(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchProfile();
  }, [targetUsername, token]);

  const handleSendFriendRequest = async () => {
    if (!token) {
      showToast('Please log in to send a friend request!', 'error');
      return;
    }
    try {
      const res = await fetch('/api/social/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ target_username: targetUsername })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
      } else {
        showToast(data.error || 'Failed to send request', 'error');
      }
    } catch (e) {
      showToast('Error sending friend request', 'error');
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.7 }}>
        <Sparkles size={36} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
        <p>Loading Nook...</p>
      </div>
    );
  }

  if (!profileData || profileData.error) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Nook Not Found</h2>
        <p style={{ opacity: 0.7, margin: '1rem 0' }}>The nook @{targetUsername} does not exist or has been moved.</p>
        <Link to="/" className="btn-primary">Return Home</Link>
      </div>
    );
  }

  const themeClass = `theme-${profileData.nookSettings?.theme || 'glassmorphism'}`;
  const isOwner = user && user.username === targetUsername;

  // Render Private Nook view if access is blocked
  if (profileData.is_private) {
    return (
      <div className={themeClass} style={{ minHeight: '90vh', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '550px', margin: '0 auto', textAlign: 'center' }} className="nook-panel">
          <div style={{ width: '80px', height: '80px', margin: '0 auto 1rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={40} color="#ef4444" />
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>@{profileData.owner.username}'s Nook is Private</h2>
          <p style={{ opacity: 0.8, marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {profileData.message}
          </p>
          {user && !isOwner && (
            <button onClick={handleSendFriendRequest} className="btn-primary" style={{ margin: '0 auto' }}>
              <UserPlus size={18} />
              <span>Send Friend Request</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const { owner, nookSettings, widgets, stickers, topFriends } = profileData;

  return (
    <div className={themeClass} style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Custom CSS Injection */}
      {nookSettings?.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: nookSettings.custom_css }} />
      )}

      {/* Interactive Sticker Overlay */}
      {stickers && <StickerCanvas stickers={stickers} />}

      <div className="nook-container">
        {/* Nook Header Banner & User Bio */}
        <div className="nook-panel" style={{ marginBottom: '1.5rem', position: 'relative', overflow: 'hidden', padding: 0 }}>
          {owner.banner_url ? (
            <div style={{ height: '180px', backgroundImage: `url(${owner.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          ) : (
            <div style={{ height: '180px', background: 'linear-gradient(135deg, var(--accent-color) 0%, #a855f7 100%)' }} />
          )}

          <div style={{ padding: '1.5rem', marginTop: '-50px', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-end' }}>
              <img
                src={owner.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                alt={owner.display_name}
                style={{ width: '110px', height: '110px', borderRadius: '50%', border: '4px solid var(--bg-panel-solid)', objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
              />
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {owner.display_name || owner.username}
                  {owner.status_emoji && <span>{owner.status_emoji}</span>}
                </h1>
                <p style={{ opacity: 0.7, fontSize: '0.95rem' }}>@{owner.username}</p>
                {owner.status_message && (
                  <p style={{ fontSize: '0.85rem', marginTop: '0.4rem', fontStyle: 'italic', color: 'var(--accent-color)' }}>
                    "{owner.status_message}"
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {isOwner ? (
                <Link to="/customize" className="btn-primary">
                  <Edit3 size={16} />
                  <span>Customize My Nook</span>
                </Link>
              ) : (
                <button onClick={handleSendFriendRequest} className="btn-primary">
                  <UserPlus size={16} />
                  <span>Add Friend</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Nook Grid Widgets */}
        <div className="nook-grid">
          {/* Left Column Widgets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {owner.bio && (
              <div className="nook-panel">
                <div className="nook-panel-header">
                  <Heart size={20} />
                  <span>About {owner.display_name}</span>
                </div>
                <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{owner.bio}</p>
              </div>
            )}

            <MusicPlayerWidget
              title={nookSettings?.bg_music_title || 'Nook Anthem'}
              audioUrl={nookSettings?.bg_music_url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'}
            />

            <SpotifyWidget />
          </div>

          {/* Right Column Widgets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <TopFriendsGrid friends={topFriends || []} ownerUsername={owner.username} />
            <SteamWidget />
          </div>

          {/* Full Width Guestbook Widget */}
          <div className="nook-full-col">
            <GuestbookWidget nookUsername={owner.username} />
          </div>
        </div>
      </div>
    </div>
  );
};
