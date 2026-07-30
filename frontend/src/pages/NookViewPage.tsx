import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TopFriendsGrid } from '../components/nook/TopFriendsGrid';
import { MusicWidget } from '../components/widgets/MusicWidget';
import { MoviesWidget } from '../components/widgets/MoviesWidget';
import { BooksWidget } from '../components/widgets/BooksWidget';
import { SteamWidget } from '../components/widgets/SteamWidget';
import { HobbiesWidget } from '../components/widgets/HobbiesWidget';
import { GuestbookWidget } from '../components/nook/GuestbookWidget';
import { StickerCanvas } from '../components/nook/StickerCanvas';
import { ThemeAnimationOverlay } from '../components/nook/ThemeAnimationOverlay';
import { ShieldAlert, UserPlus, Heart, Sparkles, Edit3, Users, Clock, UserCheck, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

import { playThemeSound } from '../utils/themeSoundEngine';

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

    fetch(`/api/nook/profile/${targetUsername}?_t=${Date.now()}`, { headers, cache: 'no-store' })
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

  const handleGlobalClick = (e: React.MouseEvent) => {
    if (profileData?.nookSettings) {
      const themeId = profileData.nookSettings.theme;
      const isSoundEnabled = profileData.nookSettings.theme_sounds_enabled !== 0 && profileData.nookSettings.theme_sounds_enabled !== false;
      playThemeSound(themeId, isSoundEnabled, 'click', { x: e.clientX, y: e.clientY });
    }
  };

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
        fetchProfile();
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
    const rel = profileData.relationship || 'public';
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
            rel === 'pending_outgoing' ? (
              <button disabled className="btn-secondary" style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', opacity: 0.85, cursor: 'not-allowed' }}>
                <Clock size={18} />
                <span>Friend Request Pending</span>
              </button>
            ) : rel === 'pending_incoming' ? (
              <Link to="/friends" className="btn-primary" style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={18} />
                <span>Respond to Friend Request</span>
              </Link>
            ) : rel === 'friend' ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
                <CheckCircle2 size={18} />
                <span>Friends</span>
              </div>
            ) : (
              <button onClick={handleSendFriendRequest} className="btn-primary" style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={18} />
                <span>Send Friend Request</span>
              </button>
            )
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

  // Parse custom colors
  let cardBgColor = 'rgba(0,0,0,0.3)';
  let borderColor = 'rgba(255,255,255,0.12)';
  if (nookSettings?.card_colors_json) {
    try {
      const parsedColors = typeof nookSettings.card_colors_json === 'string'
        ? JSON.parse(nookSettings.card_colors_json)
        : nookSettings.card_colors_json;
      if (parsedColors.cardBg) cardBgColor = parsedColors.cardBg;
      if (parsedColors.border) borderColor = parsedColors.border;
    } catch (e) {}
  }

  let cardTitles: Record<string, string> = {};
  if (nookSettings?.card_titles_json) {
    try {
      cardTitles = typeof nookSettings.card_titles_json === 'string'
        ? JSON.parse(nookSettings.card_titles_json)
        : nookSettings.card_titles_json;
    } catch (e) {}
  }

  const customStyle = {
    minHeight: '100vh',
    position: 'relative',
    backgroundColor: nookSettings?.bg_color || undefined,
    color: nookSettings?.text_color || undefined,
    '--bg-primary': nookSettings?.bg_color || undefined,
    '--bg-panel': cardBgColor,
    '--accent-color': nookSettings?.accent_color || undefined,
    '--text-main': nookSettings?.text_color || undefined,
    '--border-color': borderColor
  } as React.CSSProperties;

  const animationsEnabled = nookSettings?.theme_animations_enabled !== 0;

  let parsedMusicTracks: any[] = [];
  let autoNextPlay = true;
  let loopPlaylist = false;

  if (nookSettings?.music_tracks_json) {
    try {
      const rawMusicData = typeof nookSettings.music_tracks_json === 'string'
        ? JSON.parse(nookSettings.music_tracks_json)
        : nookSettings.music_tracks_json;
      if (Array.isArray(rawMusicData)) {
        parsedMusicTracks = rawMusicData;
      } else if (rawMusicData && typeof rawMusicData === 'object') {
        parsedMusicTracks = rawMusicData.tracks || [];
        if (rawMusicData.autoNextPlay !== undefined) autoNextPlay = !!rawMusicData.autoNextPlay;
        if (rawMusicData.loopPlaylist !== undefined) loopPlaylist = !!rawMusicData.loopPlaylist;
      }
    } catch (e) {}
  }

  const [dialupStatus, setDialupStatus] = useState({
    transferredKb: 0,
    totalKb: 248,
    done: false,
    statusText: '🌐 Dialing ISP (28.8 Kbps)...'
  });

  const isWin9xTheme = nookSettings?.theme === 'win98' || nookSettings?.theme === 'win9x';

  // Randomized Per-Image Delays & Speeds on every load
  useEffect(() => {
    if (!isWin9xTheme) return;
    const timer = setTimeout(() => {
      const imgs = document.querySelectorAll('.nook-container img, .nook-banner-image');
      imgs.forEach((img, idx) => {
        const duration = (Math.random() * 1.4 + 1.2).toFixed(2);
        const delay = (idx * 0.35 + Math.random() * 0.3).toFixed(2);
        (img as HTMLElement).style.animationDuration = `${duration}s`;
        (img as HTMLElement).style.animationDelay = `${delay}s`;
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [isWin9xTheme, targetUsername, profileData]);

  // Live Dial-up Transfer Counter
  useEffect(() => {
    if (!isWin9xTheme) return;
    const totalKb = 220 + Math.floor(Math.random() * 90);
    setDialupStatus({ transferredKb: 0, totalKb, done: false, statusText: '🌐 Dialing ISP (28.8 Kbps)...' });

    let currentKb = 0;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed < 0.5) {
        currentKb = Math.min(totalKb, Math.floor((elapsed / 0.5) * 16));
        setDialupStatus({
          transferredKb: currentKb,
          totalKb,
          done: false,
          statusText: `🌐 Handshake established (28.8 Kbps)... [${currentKb}KB / ${totalKb}KB]`
        });
      } else if (currentKb < totalKb) {
        const burst = Math.floor(Math.random() * 32) + 14;
        currentKb = Math.min(totalKb, currentKb + burst);
        setDialupStatus({
          transferredKb: currentKb,
          totalKb,
          done: false,
          statusText: `🌐 Transferring page & pictures top-to-bottom... [${currentKb}KB / ${totalKb}KB]`
        });
      } else {
        clearInterval(interval);
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        setDialupStatus({
          transferredKb: totalKb,
          totalKb,
          done: true,
          statusText: `✅ Document: Done (${totalKb}KB in ${totalTime}s) — AOL 4.0`
        });
      }
    }, 350);

    return () => clearInterval(interval);
  }, [isWin9xTheme, targetUsername]);

  return (
    <div className={themeClass} style={customStyle} onClick={handleGlobalClick}>
      {/* Retro Win9X Dial-Up Connection Bar */}
      {isWin9xTheme && (
        <div style={{
          background: '#c0c0c0',
          color: '#000000',
          borderBottom: '2px solid #000000',
          borderTop: '2px solid #ffffff',
          padding: '4px 12px',
          fontSize: '0.78rem',
          fontFamily: "'MS Sans Serif', Tahoma, sans-serif",
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold',
          letterSpacing: '0.5px',
          boxShadow: 'inset 0 -1px 0 #808080',
          marginBottom: '1rem'
        }}>
          <span>{dialupStatus.statusText}</span>
          <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>Netscape Navigator v4.77</span>
        </div>
      )}

      {/* Custom CSS Injection */}
      {nookSettings?.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: nookSettings.custom_css }} />
      )}

      {/* Theme Animated Micro-Overlays */}
      {animationsEnabled && <ThemeAnimationOverlay theme={nookSettings?.theme} />}

      {/* Layer 1: Behind Cards Sticker Overlay */}
      {stickers && <StickerCanvas stickers={stickers} targetLayer="behind_cards" />}

      <div className="nook-container" style={{ position: 'relative', zIndex: 10 }}>
        {/* Nook Header Banner & User Bio */}
        <div className="nook-panel" style={{ marginBottom: '1.5rem', position: 'relative', overflow: 'hidden', padding: 0 }}>
          {owner.banner_url ? (
            <div style={{ height: '180px', position: 'relative', overflow: 'hidden' }}>
              <img
                className="nook-banner-image"
                src={owner.banner_url}
                alt="Nook Banner"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
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
              ) : profileData.relationship === 'friend' ? (
                <div className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'default' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--accent-color)' }} />
                  <span>Friends</span>
                </div>
              ) : profileData.relationship === 'pending_outgoing' ? (
                <div className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'default', opacity: 0.8 }}>
                  <Clock size={16} />
                  <span>Request Pending</span>
                </div>
              ) : profileData.relationship === 'pending_incoming' ? (
                <Link to="/friends" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <UserCheck size={16} />
                  <span>Respond to Request</span>
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
                  <span>{cardTitles.bio || `About ${owner.display_name || owner.username}`}</span>
                </div>
                <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{owner.bio}</p>
              </div>
            )}

            {cardVis.music !== false && (
              <MusicWidget
                title={cardTitles.music || 'My Music Playlist'}
                tracks={parsedMusicTracks}
                autoNextPlay={autoNextPlay}
                loopPlaylist={loopPlaylist}
                bgMusicUrl={nookSettings?.bg_music_url}
                bgMusicTitle={nookSettings?.bg_music_title}
                spotifyTrackUrl={nookSettings?.spotify_track_url}
                appleMusicUrl={nookSettings?.apple_music_url}
              />
            )}

            {cardVis.movies !== false && (
              <MoviesWidget
                title={cardTitles.movies || 'Movies & TV Favorites'}
                movies={nookSettings?.favorite_movies_json ? (typeof nookSettings.favorite_movies_json === 'string' ? JSON.parse(nookSettings.favorite_movies_json) : nookSettings.favorite_movies_json) : []}
              />
            )}

            {cardVis.hobbies !== false && (
              <HobbiesWidget
                title={cardTitles.hobbies || 'Hobbies & Passions'}
                hobbies={nookSettings?.hobbies_json ? (typeof nookSettings.hobbies_json === 'string' ? JSON.parse(nookSettings.hobbies_json) : nookSettings.hobbies_json) : []}
                isOwner={user?.id === owner.id}
              />
            )}
          </div>

          {/* Right Column Widgets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {cardVis.friends !== false && (
              <TopFriendsGrid
                title={cardTitles.friends || 'Top Friends'}
                topFriends={topFriends}
                ownerUsername={owner.display_name || owner.username}
              />
            )}

            {cardVis.books !== false && (
              <BooksWidget
                title={cardTitles.books || 'Reading Nook & Favorite Books'}
                books={nookSettings?.favorite_books_json ? (typeof nookSettings.favorite_books_json === 'string' ? JSON.parse(nookSettings.favorite_books_json) : nookSettings.favorite_books_json) : []}
                storygraphUsername={nookSettings?.storygraph_username}
              />
            )}

            {cardVis.steam !== false && nookSettings?.steam_id64 && (
              <SteamWidget
                steamId64={nookSettings.steam_id64}
                displayMode={nookSettings.steam_display_mode || 'both'}
              />
            )}
          </div>

          {/* Full Width Guestbook Widget */}
          {cardVis.guestbook !== false && (
            <div className="nook-full-col">
              <GuestbookWidget
                nookUsername={owner.username}
                nookTheme={nookSettings?.theme}
                themeSoundsEnabled={nookSettings?.theme_sounds_enabled !== 0 && nookSettings?.theme_sounds_enabled !== false}
              />
            </div>
          )}
        </div>
      </div>

      {/* Layer 2: Above Cards Sticker Overlay */}
      {stickers && <StickerCanvas stickers={stickers} targetLayer="above_cards" />}
    </div>
  );
};
