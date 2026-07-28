import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TopFriendsGrid } from '../components/nook/TopFriendsGrid';
import { MusicWidget } from '../components/widgets/MusicWidget';
import { SteamWidget } from '../components/widgets/SteamWidget';
import { GuestbookWidget } from '../components/nook/GuestbookWidget';
import { StickerCanvas } from '../components/nook/StickerCanvas';
import { ShieldAlert, UserPlus, Heart, Sparkles, Edit3, Users } from 'lucide-react';
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
        if (data.owner) {
          document.title = `${data.owner.display_name || data.owner.username}'s Nook | WebNook`;
        }
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
      showToast('Please log in to send a friend request.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: targetUsername })
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
      <div style={{ textAlign: 'center', padding: '5rem', opacity: 0.7 }}>
        <Sparkles size={36} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--accent-color)' }} />
        <p>Loading Nook profile...</p>
      </div>
    );
  }

  if (!profileData || profileData.error) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <h2>Nook Not Found</h2>
        <p>The profile @{targetUsername} could not be found.</p>
        <Link to="/" className="btn-primary" style={{ display: 'inline-flex', marginTop: '1rem' }}>Return Home</Link>
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
          <div style={{ width: '80px', height: '80px', margin: '0 auto 1rem', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
            <Sparkles size={40} />
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>@{profileData.owner.username}'s Cozy Nook</h2>
          <p style={{ opacity: 0.85, marginBottom: '1.5rem', lineHeight: 1.6, fontSize: '0.95rem' }}>
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

  const { owner, nookSettings, stickers, topFriends } = profileData;

  // Parse card visibility toggles
  let cardVis: Record<string, boolean> = { bio: true, music: true, friends: true, guestbook: true, steam: true };
  if (nookSettings?.card_visibility_json) {
    try {
      const parsed = typeof nookSettings.card_visibility_json === 'string'
        ? JSON.parse(nookSettings.card_visibility_json)
        : nookSettings.card_visibility_json;
      cardVis = { ...cardVis, ...parsed };
    } catch (e) {}
  }

  return (
    <div className={themeClass} style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Custom CSS Injection */}
      {nookSettings?.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: nookSettings.custom_css }} />
      )}

      {/* Layer 1: Behind Cards Sticker Overlay */}
      {stickers && <StickerCanvas stickers={stickers} targetLayer="behind_cards" />}

      <div className="nook-container" style={{ position: 'relative', zIndex: 10 }}>
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
            {cardVis.bio !== false && owner.bio && (
              <div className="nook-panel">
                <div className="nook-panel-header">
                  <Heart size={20} />
                  <span>About {owner.display_name || owner.username}</span>
                </div>
                <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{owner.bio}</p>
              </div>
            )}

            {cardVis.music !== false && (
              <MusicWidget
                bgMusicUrl={nookSettings?.bg_music_url}
                bgMusicTitle={nookSettings?.bg_music_title}
                spotifyTrackUrl={nookSettings?.spotify_track_url}
                appleMusicUrl={nookSettings?.apple_music_url}
              />
            )}
          </div>

          {/* Right Column Widgets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {cardVis.friends !== false && (
              <div className="nook-panel">
                <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={20} color="var(--accent-color)" />
                    <span>Top Friends</span>
                  </div>
                  <Link to="/friends" style={{ fontSize: '0.75rem', color: 'var(--accent-color)', textDecoration: 'none' }}>
                    View All →
                  </Link>
                </div>

                {(!topFriends || topFriends.length === 0) ? (
                  <p style={{ opacity: 0.6, fontSize: '0.85rem', margin: 0, textAlign: 'center', padding: '1rem 0' }}>
                    No favorited top friends yet ✨
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
                    {topFriends.map((f: any) => (
                      <Link key={f.id} to={`/nook/${f.username}`} style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center' }}>
                        <img
                          src={f.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt={f.username}
                          style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', marginBottom: '0.3rem' }}
                        />
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {f.display_name || f.username}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {cardVis.steam !== false && nookSettings?.steam_id64 && (
              <SteamWidget steamId64={nookSettings.steam_id64} />
            )}
          </div>

          {/* Full Width Guestbook Widget */}
          {cardVis.guestbook !== false && (
            <div className="nook-full-col">
              <GuestbookWidget nookUsername={owner.username} />
            </div>
          )}
        </div>
      </div>

      {/* Layer 2: Above Cards Sticker Overlay */}
      {stickers && <StickerCanvas stickers={stickers} targetLayer="above_cards" />}
    </div>
  );
};
