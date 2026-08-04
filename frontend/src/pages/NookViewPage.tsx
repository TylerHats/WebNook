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
import { ShieldAlert, UserPlus, Heart, Sparkles, Edit3, Users, Clock, UserCheck, CheckCircle2, FileText, Code, Lock, LogIn } from 'lucide-react';
import { useToast } from '../context/ToastContext';

import { playThemeSound } from '../utils/themeSoundEngine';
import { MarkdownRenderer } from '../components/ui/MarkdownRenderer';
import { getThemeById } from '../themes/registry';

export const NookViewPage: React.FC = () => {
  const { username } = useParams<{ username?: string }>();
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const targetUsername = username || user?.username || 'admin';
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialupStatus, setDialupStatus] = useState({
    transferredKb: 0,
    totalKb: 248,
    done: false,
    statusText: '🌐 Dialing ISP (28.8 Kbps)...'
  });

  const [appName, setAppName] = useState('WebNook');

  useEffect(() => {
    fetch('/api/branding/public')
      .then(res => res.json())
      .then(data => {
        if (data.app_name) setAppName(data.app_name);
      })
      .catch(() => {});
  }, []);

  const fetchProfile = () => {
    setIsLoading(true);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`/api/nook/profile/${targetUsername}?_t=${Date.now()}`, { headers, cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setProfileData(data);
        if (data?.owner) {
          document.title = `${data.owner.display_name || data.owner.username}'s Nook | ${appName}`;
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
  }, [targetUsername, token, appName]);

  const isWin9xTheme = profileData?.nookSettings?.theme === 'win98' || profileData?.nookSettings?.theme === 'win9x';

  const [isMobileScreen, setIsMobileScreen] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobileScreen(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fully Randomized Per-Image Delays & Speeds (all finish within ~2.4s)
  useEffect(() => {
    if (!isWin9xTheme) return;
    const timer = setTimeout(() => {
      const imgs = document.querySelectorAll('.nook-container img, .nook-banner-image');
      imgs.forEach((img) => {
        const delay = (Math.random() * 1.1).toFixed(2);
        const duration = (0.8 + Math.random() * 0.5).toFixed(2);
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

  // Render Disabled Account Nook view if account is disabled by admins
  if (profileData.is_disabled) {
    return (
      <div className={themeClass} style={{ minHeight: '90vh', padding: '3rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center', padding: '2.5rem 1.5rem' }} className="nook-panel">
          {profileData.owner?.avatar_url ? (
            <div style={{ position: 'relative', width: '90px', height: '90px', margin: '0 auto 1.25rem' }}>
              <img
                src={profileData.owner.avatar_url}
                alt={profileData.owner.display_name || profileData.owner.username}
                style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #ef4444', filter: 'grayscale(0.8)', opacity: 0.8 }}
              />
              <div style={{ position: 'absolute', bottom: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: '50%', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert size={16} />
              </div>
            </div>
          ) : (
            <div style={{ width: '80px', height: '80px', margin: '0 auto 1.25rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <ShieldAlert size={40} />
            </div>
          )}

          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.6rem', fontWeight: 800 }}>
            @{profileData.owner?.username || targetUsername}'s Nook is Disabled 🔒
          </h2>

          <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={16} />
              <span>Account Disabled by Administrators</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, lineHeight: 1.5 }}>
              {profileData.disabled_reason || 'This account has been temporarily or permanently disabled by site administrators.'}
            </p>
          </div>

          <p style={{ opacity: 0.75, marginBottom: '1.75rem', lineHeight: 1.5, fontSize: '0.88rem' }}>
            While this account is disabled, their Nook profile, guestbook, and content are locked and unavailable for viewing.
          </p>

          <Link to="/" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}>
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    );
  }

  // Render Private Nook view if access is blocked
  if (profileData.is_private) {
    const rel = profileData.relationship || 'public';
    const returnUrl = encodeURIComponent(`/nook/${targetUsername}`);

    return (
      <div className={themeClass} style={{ minHeight: '90vh', padding: '3rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center', padding: '2.5rem 1.5rem' }} className="nook-panel">
          {profileData.owner?.avatar_url ? (
            <img
              src={profileData.owner.avatar_url}
              alt={profileData.owner.display_name || profileData.owner.username}
              style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1.25rem', border: '3px solid var(--accent-color)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
            />
          ) : (
            <div style={{ width: '80px', height: '80px', margin: '0 auto 1.25rem', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
              <Lock size={40} />
            </div>
          )}

          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.6rem', fontWeight: 800 }}>@{profileData.owner.username}'s Cozy Nook</h2>

          <p style={{ opacity: 0.9, marginBottom: '1.75rem', lineHeight: 1.6, fontSize: '0.98rem' }}>
            {profileData.message}
          </p>

          {!user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', alignItems: 'center', width: '100%', maxWidth: '320px', margin: '0 auto' }}>
              <Link
                to={`/login?redirect=${returnUrl}`}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.2rem', fontSize: '0.95rem' }}
              >
                <LogIn size={18} />
                <span>Sign In to Request Access</span>
              </Link>
              
              <Link
                to={`/register?redirect=${returnUrl}`}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.2rem', fontSize: '0.88rem' }}
              >
                <UserPlus size={16} />
                <span>New here? Create an Account</span>
              </Link>
            </div>
          ) : (
            !isOwner && (
              rel === 'pending_outgoing' ? (
                <button disabled className="btn-secondary" style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', opacity: 0.85, cursor: 'not-allowed', padding: '0.65rem 1.2rem' }}>
                  <Clock size={18} />
                  <span>Friend Request Pending</span>
                </button>
              ) : rel === 'pending_incoming' ? (
                <Link to="/friends" className="btn-primary" style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.2rem' }}>
                  <UserCheck size={18} />
                  <span>Respond to Friend Request</span>
                </Link>
              ) : rel === 'friend' ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.58rem 1.2rem', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#4ade80', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 700 }}>
                  <CheckCircle2 size={18} />
                  <span>Friends</span>
                </div>
              ) : (
                <button onClick={handleSendFriendRequest} className="btn-primary" style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.2rem' }}>
                  <UserPlus size={18} />
                  <span>Send Friend Request</span>
                </button>
              )
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
        <div className="nook-panel nook-header-panel">
          {owner.banner_url ? (
            <div className="nook-header-banner">
              <img
                className="nook-banner-image"
                src={owner.banner_url}
                alt="Nook Banner"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div className="nook-header-banner" style={{ background: 'linear-gradient(135deg, var(--accent-color) 0%, #a855f7 100%)' }} />
          )}

          <div className="nook-header-body">
            <div className="nook-avatar-name-group">
              <img
                src={owner.avatar_url || '/branding/default_avatar.svg'}
                alt={owner.display_name}
                className="nook-header-avatar"
              />
              <div className="nook-header-user-info">
                <h1 className="nook-header-title">
                  {owner.display_name || owner.username}
                </h1>
                <p className="nook-header-handle">@{owner.username}</p>
                {owner.status_message && (
                  <p className="nook-header-status">
                    "{owner.status_message}"
                  </p>
                )}
              </div>
            </div>

            <div className="nook-header-actions">
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

        {/* Dynamic Reorderable Nook Grid Cards */}
        {(() => {
          const DEFAULT_LAYOUT = [
            { id: 'c_bio', type: 'bio', title: 'About Me', enabled: true },
            { id: 'c_music', type: 'music', title: 'My Music Playlist', enabled: true },
            { id: 'c_friends', type: 'friends', title: 'Top Friends', enabled: true },
            { id: 'c_hobbies', type: 'hobbies', title: 'Hobbies & Passions', enabled: true },
            { id: 'c_movies', type: 'movies', title: 'Movies & TV Favorites', enabled: true },
            { id: 'c_books', type: 'books', title: 'Reading Nook & Books', enabled: true },
            { id: 'c_steam', type: 'steam', title: 'Steam Showcase', enabled: true },
            { id: 'c_guestbook', type: 'guestbook', title: 'Guestbook Notes', enabled: true }
          ];

          let cardLayout: any[] = DEFAULT_LAYOUT;
          if (nookSettings?.card_layout_json) {
            try {
              const parsed = typeof nookSettings.card_layout_json === 'string'
                ? JSON.parse(nookSettings.card_layout_json)
                : nookSettings.card_layout_json;
              if (Array.isArray(parsed) && parsed.length > 0) {
                cardLayout = parsed;
              }
            } catch (e) {}
          }

          const activeCards = cardLayout.filter(c => c.enabled !== false);
          const gridCards = activeCards.filter(c => c.type !== 'guestbook');
          const guestbookCards = activeCards.filter(c => c.type === 'guestbook');

          const leftCards = gridCards.filter((_, idx) => idx % 2 === 0);
          const rightCards = gridCards.filter((_, idx) => idx % 2 !== 0);

          const activeThemeDef = getThemeById(nookSettings?.theme);

          const resolveTitle = (c: any, defaultFallback: string) => {
            if (c.title && c.title.trim() !== '') return c.title;
            if (cardTitles && cardTitles[c.type]) return cardTitles[c.type];
            if (activeThemeDef?.defaultCardTitles && activeThemeDef.defaultCardTitles[c.type]) {
              return activeThemeDef.defaultCardTitles[c.type];
            }
            return defaultFallback;
          };

          const renderSingleCard = (c: any) => {
            if (!c) return null;
            switch (c.type) {
              case 'bio':
                return owner.bio ? (
                  <div key={c.id} className="nook-panel">
                    <div className="nook-panel-header">
                      <Heart size={20} />
                      <span>{resolveTitle(c, `About ${owner.display_name || owner.username}`)}</span>
                    </div>
                    <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{owner.bio}</p>
                  </div>
                ) : null;

              case 'music':
                return (
                  <MusicWidget
                    key={c.id}
                    title={resolveTitle(c, 'My Music Playlist')}
                    tracks={c.music_tracks || parsedMusicTracks}
                    autoNextPlay={autoNextPlay}
                    loopPlaylist={loopPlaylist}
                    bgMusicUrl={nookSettings?.bg_music_url}
                    bgMusicTitle={nookSettings?.bg_music_title}
                    spotifyTrackUrl={nookSettings?.spotify_track_url}
                    appleMusicUrl={nookSettings?.apple_music_url}
                  />
                );

              case 'movies':
                return (
                  <MoviesWidget
                    key={c.id}
                    title={resolveTitle(c, 'Movies & TV Favorites')}
                    movies={c.favorite_movies || (nookSettings?.favorite_movies_json ? (typeof nookSettings.favorite_movies_json === 'string' ? JSON.parse(nookSettings.favorite_movies_json) : nookSettings.favorite_movies_json) : [])}
                  />
                );

              case 'hobbies':
                return (
                  <HobbiesWidget
                    key={c.id}
                    title={resolveTitle(c, 'Hobbies & Passions')}
                    hobbies={c.hobbies || (nookSettings?.hobbies_json ? (typeof nookSettings.hobbies_json === 'string' ? JSON.parse(nookSettings.hobbies_json) : nookSettings.hobbies_json) : [])}
                    isOwner={user?.id === owner.id}
                  />
                );

              case 'friends':
                return (
                  <TopFriendsGrid
                    key={c.id}
                    title={resolveTitle(c, 'Top Friends')}
                    topFriends={topFriends}
                    ownerUsername={owner.display_name || owner.username}
                  />
                );

              case 'books':
                return (
                  <BooksWidget
                    key={c.id}
                    title={resolveTitle(c, 'Reading Nook & Favorite Books')}
                    books={c.favorite_books || (nookSettings?.favorite_books_json ? (typeof nookSettings.favorite_books_json === 'string' ? JSON.parse(nookSettings.favorite_books_json) : nookSettings.favorite_books_json) : [])}
                    storygraphUsername={nookSettings?.storygraph_username}
                  />
                );

              case 'steam':
                return (c.steam_id64 || nookSettings?.steam_id64) ? (
                  <SteamWidget
                    key={c.id}
                    title={resolveTitle(c, 'Steam Showcase')}
                    steamId64={c.steam_id64 || nookSettings.steam_id64}
                    displayMode={c.steam_display_mode || nookSettings.steam_display_mode || 'both'}
                    excludedGames={c.steam_excluded_games || (nookSettings?.steam_excluded_games_json ? (typeof nookSettings.steam_excluded_games_json === 'string' ? JSON.parse(nookSettings.steam_excluded_games_json) : nookSettings.steam_excluded_games_json) : [])}
                  />
                ) : null;

              case 'markdown':
                return (
                  <div key={c.id} className="nook-panel">
                    {c.title && (
                      <div className="nook-panel-header">
                        {c.icon ? (
                          <span style={{ fontSize: '1.1rem', marginRight: '0.2rem' }}>{c.icon}</span>
                        ) : (
                          <FileText size={20} />
                        )}
                        <span>{c.title}</span>
                      </div>
                    )}
                    <MarkdownRenderer content={c.content_markdown || ''} />
                  </div>
                );

              case 'html':
                return (
                  <div key={c.id} className="nook-panel">
                    {c.title && (
                      <div className="nook-panel-header">
                        {c.icon ? (
                          <span style={{ fontSize: '1.1rem', marginRight: '0.2rem' }}>{c.icon}</span>
                        ) : (
                          <Code size={20} />
                        )}
                        <span>{c.title}</span>
                      </div>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: c.content_html || '' }} />
                  </div>
                );

              default:
                return null;
            }
          };

          return (
            <div className="nook-grid">
              {isMobileScreen ? (
                /* Mobile View: Render ALL active cards in a single column in sequential top-to-bottom order */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', gridColumn: '1 / -1' }}>
                  {gridCards.map(c => renderSingleCard(c))}
                </div>
              ) : (
                /* Desktop View: Split into 2 columns */
                <>
                  {/* Left Column Widgets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {leftCards.map(c => renderSingleCard(c))}
                  </div>

                  {/* Right Column Widgets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {rightCards.map(c => renderSingleCard(c))}
                  </div>
                </>
              )}

              {/* Always Render Guestbook Notes Section at the Bottom */}
              <div className="nook-full-col" style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <GuestbookWidget
                  nookUsername={owner.username}
                  nookTheme={nookSettings?.theme}
                  themeSoundsEnabled={nookSettings?.theme_sounds_enabled !== 0 && nookSettings?.theme_sounds_enabled !== false}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Layer 2: Above Cards Sticker Overlay */}
      {stickers && <StickerCanvas stickers={stickers} targetLayer="above_cards" />}
    </div>
  );
};
