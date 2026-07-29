import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Palette, Sparkles, Image, Music, Eye, Code, Plus, Trash2, Save, Gamepad2, Layers, CheckSquare, Volume2, Upload, FileText } from 'lucide-react';
import { StickerCanvas, Sticker } from '../components/nook/StickerCanvas';
import { PRESET_STICKERS } from '../constants/presetStickers';

import { VisualStickerStudioModal } from '../components/nook/VisualStickerStudioModal';
import { MusicTrack } from '../components/widgets/MusicWidget';
import { ImageCropModal } from '../components/ui/ImageCropModal';

export const NookCustomizerPage: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [theme, setTheme] = useState('glassmorphism');
  const [visibilityNook, setVisibilityNook] = useState('private');

  // Image Crop Modal state
  const [cropModal, setCropModal] = useState<{
    isOpen: boolean;
    file: File | null;
    title: string;
    aspectRatio: number;
    target: 'avatar' | 'banner' | 'sticker';
  }>({
    isOpen: false,
    file: null,
    title: '',
    aspectRatio: 1,
    target: 'avatar'
  });
  const [bgColor, setBgColor] = useState('#12131C');
  const [cardBgColor, setCardBgColor] = useState('rgba(255,255,255,0.06)');
  const [accentColor, setAccentColor] = useState('#6366f1');
  const [textColor, setTextColor] = useState('#ffffff');
  const [borderColor, setBorderColor] = useState('rgba(255,255,255,0.1)');

  // Steam & Music integration state
  const [steamId64, setSteamId64] = useState('');
  const [steamDisplayMode, setSteamDisplayMode] = useState<'none' | 'recently_played' | 'top_games' | 'both'>('both');
  const [spotifyTrackUrl, setSpotifyTrackUrl] = useState('');
  const [appleMusicUrl, setAppleMusicUrl] = useState('');
  const [bgMusicUrl, setBgMusicUrl] = useState('');
  const [bgMusicTitle, setBgMusicTitle] = useState('');
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [autoNextPlay, setAutoNextPlay] = useState(true);
  const [loopPlaylist, setLoopPlaylist] = useState(false);
  const [newTrackType, setNewTrackType] = useState<'spotify' | 'apple' | 'audio'>('spotify');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [showStickerStudio, setShowStickerStudio] = useState(false);

  // Custom file upload label states
  const [avatarFileName, setAvatarFileName] = useState('');
  const [bannerFileName, setBannerFileName] = useState('');
  const [audioFileName, setAudioFileName] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [stickerFileName, setStickerFileName] = useState('');

  const handleAddTrack = () => {
    if (!newTrackUrl && newTrackType !== 'audio') return;
    const track: MusicTrack = {
      id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: newTrackTitle.trim() || (newTrackType === 'spotify' ? 'Spotify Track' : newTrackType === 'apple' ? 'Apple Music Track' : 'Audio Track'),
      type: newTrackType,
      url: newTrackUrl.trim()
    };
    setMusicTracks(prev => [...prev, track]);
    setNewTrackTitle('');
    setNewTrackUrl('');
    showToast('Track added to playlist draft!', 'info');
  };

  const handleRemoveTrack = (index: number) => {
    setMusicTracks(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveTrack = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= musicTracks.length) return;
    const updated = [...musicTracks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setMusicTracks(updated);
  };

  // Card Enablement Toggles & Custom Titles
  const [cardVisibility, setCardVisibility] = useState<Record<string, boolean>>({
    bio: true,
    music: true,
    friends: true,
    guestbook: true,
    steam: true,
    movies: true,
    books: true
  });

  const [cardTitles, setCardTitles] = useState<Record<string, string>>({
    bio: 'About Me',
    music: 'My Music Playlist',
    friends: 'Top Friends',
    guestbook: 'Guestbook',
    steam: 'Steam Showcase',
    movies: 'Movies & TV Favorites',
    books: 'Reading Nook & Books'
  });

  const [favoriteMovies, setFavoriteMovies] = useState<any[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<any[]>([]);
  const [topFriends, setTopFriends] = useState<any[]>([]);
  const [storygraphUsername, setStorygraphUsername] = useState('');
  const [themeSoundsEnabled, setThemeSoundsEnabled] = useState(true);
  const [themeAnimationsEnabled, setThemeAnimationsEnabled] = useState(true);

  // Search popover modals
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [spotifySearchQ, setSpotifySearchQ] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);

  const [showMoviesSearch, setShowMoviesSearch] = useState(false);
  const [moviesSearchQ, setMoviesSearchQ] = useState('');
  const [moviesResults, setMoviesResults] = useState<any[]>([]);

  const [showBooksSearch, setShowBooksSearch] = useState(false);
  const [booksSearchQ, setBooksSearchQ] = useState('');
  const [booksResults, setBooksResults] = useState<any[]>([]);

  const [customCss, setCustomCss] = useState('');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetch(`/api/nook/profile/${user.username}?_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
        .then(res => res.json())
        .then(data => {
          if (data.nookSettings) {
            setTheme(data.nookSettings.theme || 'glassmorphism');
            setVisibilityNook(data.nookSettings.visibility_nook || 'private');
            setBgColor(data.nookSettings.bg_color || '#12131C');
            setAccentColor(data.nookSettings.accent_color || '#6366f1');
            setTextColor(data.nookSettings.text_color || '#ffffff');
            setBgMusicUrl(data.nookSettings.bg_music_url || '');
            setBgMusicTitle(data.nookSettings.bg_music_title || '');
            setSteamId64(data.nookSettings.steam_id64 || '');
            setSteamDisplayMode(data.nookSettings.steam_display_mode || 'both');
            setSpotifyTrackUrl(data.nookSettings.spotify_track_url || '');
            setAppleMusicUrl(data.nookSettings.apple_music_url || '');
            setStorygraphUsername(data.nookSettings.storygraph_username || '');
            setCustomCss(data.nookSettings.custom_css || '');
            if (Array.isArray(data.topFriends)) setTopFriends(data.topFriends);
            if (data.nookSettings.theme_sounds_enabled !== undefined) setThemeSoundsEnabled(!!data.nookSettings.theme_sounds_enabled);
            if (data.nookSettings.theme_animations_enabled !== undefined) setThemeAnimationsEnabled(!!data.nookSettings.theme_animations_enabled);

            if (data.nookSettings.music_tracks_json) {
              try {
                const parsedTracks = typeof data.nookSettings.music_tracks_json === 'string'
                  ? JSON.parse(data.nookSettings.music_tracks_json)
                  : data.nookSettings.music_tracks_json;
                if (Array.isArray(parsedTracks)) {
                  setMusicTracks(parsedTracks);
                } else if (parsedTracks && typeof parsedTracks === 'object') {
                  setMusicTracks(parsedTracks.tracks || []);
                  if (parsedTracks.autoNextPlay !== undefined) setAutoNextPlay(!!parsedTracks.autoNextPlay);
                  if (parsedTracks.loopPlaylist !== undefined) setLoopPlaylist(!!parsedTracks.loopPlaylist);
                }
              } catch (e) {}
            }

            if (data.nookSettings.favorite_movies_json) {
              try {
                const parsed = typeof data.nookSettings.favorite_movies_json === 'string'
                  ? JSON.parse(data.nookSettings.favorite_movies_json)
                  : data.nookSettings.favorite_movies_json;
                if (Array.isArray(parsed)) setFavoriteMovies(parsed);
              } catch (e) {}
            }

            if (data.nookSettings.favorite_books_json) {
              try {
                const parsed = typeof data.nookSettings.favorite_books_json === 'string'
                  ? JSON.parse(data.nookSettings.favorite_books_json)
                  : data.nookSettings.favorite_books_json;
                if (Array.isArray(parsed)) setFavoriteBooks(parsed);
              } catch (e) {}
            }

            if (data.nookSettings.card_titles_json) {
              try {
                const parsed = typeof data.nookSettings.card_titles_json === 'string'
                  ? JSON.parse(data.nookSettings.card_titles_json)
                  : data.nookSettings.card_titles_json;
                setCardTitles(prev => ({ ...prev, ...parsed }));
              } catch (e) {}
            }

            if (data.nookSettings.card_visibility_json) {
              try {
                const parsed = typeof data.nookSettings.card_visibility_json === 'string'
                  ? JSON.parse(data.nookSettings.card_visibility_json)
                  : data.nookSettings.card_visibility_json;
                setCardVisibility(prev => ({ ...prev, ...parsed }));
              } catch (e) {}
            }

            if (data.nookSettings.card_colors_json) {
              try {
                const parsedColors = typeof data.nookSettings.card_colors_json === 'string'
                  ? JSON.parse(data.nookSettings.card_colors_json)
                  : data.nookSettings.card_colors_json;
                if (parsedColors.cardBg) setCardBgColor(parsedColors.cardBg);
                if (parsedColors.border) setBorderColor(parsedColors.border);
              } catch (e) {}
            }
          }
          if (data.stickers) {
            setStickers(data.stickers);
          }
        })
        .catch(err => console.error(err));
    }
  }, [user, token]);

  const handleApplyPalette = (palette: { bg: string; cardBg: string; accent: string; text: string; border: string }) => {
    setBgColor(palette.bg);
    setCardBgColor(palette.cardBg);
    setAccentColor(palette.accent);
    setTextColor(palette.text);
    setBorderColor(palette.border);
    showToast('Theme palette applied!', 'info');
  };

  const handleAddSticker = (url: string) => {
    const newSticker: Sticker = {
      sticker_url: url,
      pos_x: Math.floor(Math.random() * 60) + 20,
      pos_y: Math.floor(Math.random() * 60) + 20,
      scale: 1.0,
      rotation: Math.floor(Math.random() * 30) - 15,
      layer: 'above_cards'
    };
    setStickers([...stickers, newSticker]);
    showToast('Sticker added to canvas!', 'info');
  };

  const handleCustomStickerUpload = async (file: File | null) => {
    if (!file || !token) return;
    const formData = new FormData();
    formData.append('sticker', file);

    try {
      const res = await fetch('/api/nook/upload/sticker', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        handleAddSticker(data.sticker_url);
        showToast('Custom sticker uploaded & converted to lossless WebP!', 'success');
      } else {
        showToast(data.error || 'Failed to upload sticker', 'error');
      }
    } catch (e) {
      showToast('Error uploading sticker file', 'error');
    }
  };

  const handleRemoveSticker = (index: number) => {
    setStickers(stickers.filter((_, i) => i !== index));
  };

  const handleToggleStickerLayer = (index: number) => {
    setStickers(stickers.map((st, i) => {
      if (i === index) {
        const nextLayer = st.layer === 'behind_cards' ? 'above_cards' : 'behind_cards';
        return { ...st, layer: nextLayer };
      }
      return st;
    }));
  };

  const handleSearchSpotify = async () => {
    if (!spotifySearchQ.trim()) return;
    try {
      const res = await fetch(`/api/integrations/spotify/search?q=${encodeURIComponent(spotifySearchQ)}`);
      const data = await res.json();
      setSpotifyResults(data.tracks || []);
    } catch (e) {
      showToast('Spotify search failed', 'error');
    }
  };

  const handleSearchMovies = async () => {
    if (!moviesSearchQ.trim()) return;
    try {
      const res = await fetch(`/api/integrations/movies/search?q=${encodeURIComponent(moviesSearchQ)}`);
      const data = await res.json();
      setMoviesResults(data.results || []);
    } catch (e) {
      showToast('Movies search failed', 'error');
    }
  };

  const handleSearchBooks = async () => {
    if (!booksSearchQ.trim()) return;
    try {
      const res = await fetch(`/api/integrations/books/search?q=${encodeURIComponent(booksSearchQ)}`);
      const data = await res.json();
      setBooksResults(data.books || []);
    } catch (e) {
      showToast('Books search failed', 'error');
    }
  };

  const handleStoryGraphCsvUpload = async (file: File | null) => {
    if (!file || !token) return;
    const formData = new FormData();
    formData.append('csv', file);

    try {
      const res = await fetch('/api/nook/import/storygraph', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.books)) {
        setFavoriteBooks(prev => [...prev, ...data.books]);
        showToast(data.message || 'StoryGraph CSV imported!', 'success');
      } else {
        showToast(data.error || 'Failed to import CSV', 'error');
      }
    } catch (e) {
      showToast('Error importing StoryGraph CSV', 'error');
    }
  };

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);

    const cleanedMovies = favoriteMovies.map(m => {
      let r = m.rating;
      if (r === '' || r === null || r === undefined || Number.isNaN(Number(r))) r = 3;
      return { ...m, rating: Math.max(0, Math.min(5, Number(r))) };
    });

    const cleanedBooks = favoriteBooks.map(b => {
      let r = b.rating;
      if (r === '' || r === null || r === undefined || Number.isNaN(Number(r))) r = 3;
      return { ...b, rating: Math.max(0, Math.min(5, Number(r))) };
    });

    try {
      // Save Nook Customization
      const custRes = await fetch('/api/nook/customization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          theme,
          visibility_nook: visibilityNook,
          bg_color: bgColor,
          text_color: textColor,
          accent_color: accentColor,
          bg_music_url: bgMusicUrl,
          bg_music_title: bgMusicTitle,
          steam_id64: steamId64,
          steam_display_mode: steamDisplayMode,
          spotify_track_url: spotifyTrackUrl,
          apple_music_url: appleMusicUrl,
          card_visibility_json: cardVisibility,
          card_colors_json: { cardBg: cardBgColor, border: borderColor },
          card_titles_json: cardTitles,
          music_tracks_json: { tracks: musicTracks, autoNextPlay, loopPlaylist },
          favorite_movies_json: cleanedMovies,
          favorite_books_json: cleanedBooks,
          storygraph_username: storygraphUsername,
          theme_sounds_enabled: themeSoundsEnabled,
          theme_animations_enabled: themeAnimationsEnabled,
          custom_css: customCss
        })
      });

      // Save Stickers
      const stickRes = await fetch('/api/nook/stickers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ stickers })
      });

      if (custRes.ok && stickRes.ok) {
        showToast('Nook customized successfully!', 'success');
      } else {
        showToast('Failed to save customization', 'error');
      }
    } catch (e) {
      showToast('Error saving customization', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMusicFileUpload = async (file: File | null) => {
    if (!file || !token) return;
    const formData = new FormData();
    formData.append('music', file);
    try {
      const res = await fetch('/api/nook/upload/music', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setBgMusicUrl(data.bg_music_url);
        const newTrack: MusicTrack = {
          id: `tr_${Date.now()}`,
          title: bgMusicTitle.trim() || file.name,
          type: 'audio',
          url: data.bg_music_url
        };
        setMusicTracks(prev => [...prev, newTrack]);
        showToast('Background audio file uploaded & added to playlist!', 'success');
      } else {
        showToast(data.error || 'Failed to upload audio file', 'error');
      }
    } catch (e) {
      showToast('Error uploading audio file', 'error');
    }
  };

  const handleAvatarFileUpload = async (file: File | null) => {
    if (!file || !token) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await fetch('/api/nook/upload/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Profile avatar uploaded successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to upload avatar', 'error');
      }
    } catch (e) {
      showToast('Error uploading avatar file', 'error');
    }
  };

  const handleBannerFileUpload = async (file: File | null) => {
    if (!file || !token) return;
    const formData = new FormData();
    formData.append('banner', file);
    try {
      const res = await fetch('/api/nook/upload/banner', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Banner image uploaded successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to upload banner', 'error');
      }
    } catch (e) {
      showToast('Error uploading banner file', 'error');
    }
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Login Required</h2>
        <p>Please log in to customize your Nook.</p>
      </div>
    );
  }

  const customStyle = {
    minHeight: '100vh',
    padding: '2rem 1rem',
    position: 'relative',
    backgroundColor: bgColor,
    color: textColor,
    '--bg-primary': bgColor,
    '--bg-panel': cardBgColor || 'rgba(0,0,0,0.3)',
    '--accent-color': accentColor,
    '--text-main': textColor,
    '--border-color': borderColor
  } as React.CSSProperties;

  return (
    <div className={`theme-${theme}`} style={customStyle}>
      {/* Dedicated Visual Sticker Studio Modal */}
      <VisualStickerStudioModal
        isOpen={showStickerStudio}
        onClose={() => setShowStickerStudio(false)}
        stickers={stickers}
        onSaveStickers={(updatedStickers) => {
          setStickers(updatedStickers);
          handleSave();
        }}
        theme={theme}
        bgColor={bgColor}
        cardBgColor={cardBgColor}
        accentColor={accentColor}
        textColor={textColor}
        borderColor={borderColor}
        user={user}
        favoriteMovies={favoriteMovies}
        favoriteBooks={favoriteBooks}
        topFriends={topFriends}
        nookSettings={{
          steam_id64: steamId64,
          steam_display_mode: steamDisplayMode,
          bg_music_url: bgMusicUrl,
          bg_music_title: bgMusicTitle,
          spotify_track_url: spotifyTrackUrl,
          apple_music_url: appleMusicUrl,
          music_tracks_json: musicTracks,
          card_visibility_json: cardVisibility,
          card_titles_json: cardTitles
        }}
      />

      <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={28} style={{ flexShrink: 0 }} />
              <span>Nook Visual Studio & Customizer</span>
            </h1>
            <p style={{ opacity: 0.7, marginTop: '0.25rem' }}>Design your dream page with cute themes, audio, stickers, and custom CSS.</p>
          </div>
          <button onClick={handleSave} className="btn-primary" disabled={isSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, marginTop: '0.25rem' }}>
            <Save size={18} style={{ flexShrink: 0 }} />
            <span>{isSaving ? 'Saving...' : 'Save Nook'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Direct Photo Uploads Panel */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Image size={20} />
              <span>Upload Profile Avatar & Banner Images</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Upload Avatar Image</label>
                <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}>
                  <Upload size={16} />
                  <span>{avatarFileName || 'Choose Avatar Image...'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setAvatarFileName(f.name);
                        setCropModal({ isOpen: true, file: f, title: 'Crop Profile Avatar Image', aspectRatio: 1, target: 'avatar' });
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Upload Banner Image</label>
                <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}>
                  <Upload size={16} />
                  <span>{bannerFileName || 'Choose Banner Image...'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setBannerFileName(f.name);
                        setCropModal({ isOpen: true, file: f, title: 'Crop Header Banner Image', aspectRatio: 3, target: 'banner' });
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Theme Selector & Color Palette Customizer */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Sparkles size={20} />
              <span>Choose Nook Theme & Color Palettes</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { id: 'glassmorphism', name: 'Modern Glass', desc: 'Frosted glass with dark blurred backdrops', palette: { bg: '#12131C', cardBg: 'rgba(255,255,255,0.06)', accent: '#6366f1', text: '#ffffff', border: 'rgba(255,255,255,0.1)' } },
                { id: 'win9x', name: 'Retro Windows 9x Classic', desc: 'Classic 90s teal desktop with animated file transfers & bevels', palette: { bg: '#008080', cardBg: '#c0c0c0', accent: '#000080', text: '#000000', border: '#ffffff' } },
                { id: 'frutiger-aero', name: 'Frutiger Aero (Win 7)', desc: 'Glossy Windows 7 glass with aqua blue sky gradients', palette: { bg: '#1c3b6f', cardBg: 'rgba(255, 255, 255, 0.85)', accent: '#0080ff', text: '#0c2340', border: 'rgba(255, 255, 255, 0.9)' } },
                { id: 'cat-cafe', name: '🐾 Cozy Cat Café', desc: 'Warm peach & cream with dashed pink borders & paw prints', palette: { bg: '#fbf4eb', cardBg: '#fffbf7', accent: '#f43f5e', text: '#431407', border: '#fbcfe8' } },
                { id: 'cloud-dream', name: '☁️ Fluffy Cloud Dream', desc: 'Organic bubbly cloud corners with sky blue gradient', palette: { bg: '#e0f2fe', cardBg: 'rgba(255, 255, 255, 0.9)', accent: '#3b82f6', text: '#0f172a', border: '#bae6fd' } },
                { id: 'pixel-arcade', name: '👾 8-Bit Pixel Arcade', desc: 'Blocky 3D offset pixel borders with retro arcade bleeps', palette: { bg: '#0c051a', cardBg: '#190a38', accent: '#ff007f', text: '#00ffcc', border: '#ff007f' } },
                { id: 'magical-girl', name: '✨ Magical Girl Kawaii', desc: 'Pastel pink & gold scalloped borders with star sparkles', palette: { bg: '#fff0f6', cardBg: '#fff8fa', accent: '#ec4899', text: '#831843', border: '#facc15' } },
                { id: 'synthwave', name: 'Synthwave Neon', desc: 'Neon magenta glow with synthwave purples', palette: { bg: '#0d0221', cardBg: '#190b34', accent: '#ff007f', text: '#00f5d4', border: '#ff007f' } },
                { id: 'cyberpunk', name: 'Cyberpunk Y2K', desc: 'Neon laser sweep borders & electric spark pulses', palette: { bg: '#050505', cardBg: '#121212', accent: '#facc15', text: '#00ffcc', border: '#facc15' } },
                { id: 'pastel', name: 'Y2K Retro Pastel', desc: 'Warm soft pinks and playful pastel accents', palette: { bg: '#fef2f2', cardBg: '#ffffff', accent: '#ec4899', text: '#1f2937', border: '#f472b6' } },
                { id: 'coffee', name: 'Cozy Coffee', desc: 'Warm amber tones and dark roasts', palette: { bg: '#1c1917', cardBg: '#292524', accent: '#d97706', text: '#f5f5f4', border: '#78350f' } },
                { id: 'velvet', name: 'Midnight Velvet', desc: 'Deep violet, plum and glowing amethysts', palette: { bg: '#09090b', cardBg: '#18181b', accent: '#a855f7', text: '#fafafa', border: '#3f3f46' } }
              ].map(t => (
                <div
                  key={t.id}
                  onClick={() => { setTheme(t.id); handleApplyPalette(t.palette); }}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    border: theme === t.id ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    background: theme === t.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, lineHeight: 1.4 }}>{t.desc}</div>
                </div>
              ))}
            </div>

            {/* Theme Sound & Animation Toggles - Rendered ONLY for supported themes */}
            {['win9x', 'win98', 'cat-cafe', 'cloud-dream', 'pixel-arcade', 'magical-girl', 'cyberpunk', 'synthwave'].includes(theme) && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={themeSoundsEnabled}
                    onChange={e => setThemeSoundsEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  <span>🔊 Enable Theme Sound Effects (Clicks, Bleeps, Purrs & Chimes)</span>
                </label>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={themeAnimationsEnabled}
                    onChange={e => setThemeAnimationsEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                  />
                  <span>✨ Enable Theme Micro-Animations (Laser Sweeps, Walking Cat & Cloud Drift)</span>
                </label>
              </div>
            )}

            {/* Custom Theme Color Pickers */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Theme Color Overrides:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Base Background</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: '36px', height: '36px', border: 'none', background: 'none', cursor: 'pointer' }} />
                    <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Accent Highlight</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: '36px', height: '36px', border: 'none', background: 'none', cursor: 'pointer' }} />
                    <input type="text" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Text Main</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ width: '36px', height: '36px', border: 'none', background: 'none', cursor: 'pointer' }} />
                    <input type="text" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Enablement Toggles Section */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <CheckSquare size={20} />
              <span>Nook Card & Widget Enablement Toggles</span>
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
              Select which cards and features to display on your public Nook page:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { key: 'bio', label: 'Bio & About Me Card' },
                { key: 'music', label: 'Profile Anthem & Music Player' },
                { key: 'friends', label: 'Top Friends Grid' },
                { key: 'guestbook', label: 'Guestbook Notes' },
                { key: 'steam', label: 'Steam Gaming Showcase' },
                { key: 'movies', label: 'Movies & TV Showcase' },
                { key: 'books', label: 'Reading Nook & Books Showcase' }
              ].map(c => (
                <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={cardVisibility[c.key] !== false}
                    onChange={e => setCardVisibility({ ...cardVisibility, [c.key]: e.target.checked })}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>

            {/* Custom Card Titles Editor */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Customize Card Header Titles:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {[
                  { key: 'bio', label: 'Bio Header Title', defaultVal: 'About Me' },
                  { key: 'music', label: 'Music Header Title', defaultVal: 'My Music Playlist' },
                  { key: 'friends', label: 'Friends Header Title', defaultVal: 'Top Friends' },
                  { key: 'movies', label: 'Movies Header Title', defaultVal: 'Movies & TV Favorites' },
                  { key: 'books', label: 'Books Header Title', defaultVal: 'Reading Nook & Books' }
                ].map(item => (
                  <div key={item.key}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.2rem', opacity: 0.8 }}>{item.label}</label>
                    <input
                      type="text"
                      value={cardTitles[item.key] ?? item.defaultVal}
                      onChange={e => setCardTitles({ ...cardTitles, [item.key]: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Nook Privacy Controls */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Eye size={20} />
              <span>Nook Visibility & Privacy</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[
                { id: 'private', label: '🔒 Private (Default - Friends Only Access)' },
                { id: 'public', label: '🌐 Public (Anyone can view)' }
              ].map(opt => (
                <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.id}
                    checked={visibilityNook === opt.id}
                    onChange={e => setVisibilityNook(e.target.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Steam Setup Section */}
          <div className="nook-panel">
            <div className="nook-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Gamepad2 size={20} style={{ flexShrink: 0 }} />
              <span>Steam Account Integration & Game Showcase Setup</span>
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
              Link your Steam account to display your live avatar, online status, and game showcase!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Steam Profile ID / Custom Vanity URL / SteamID64</label>
                  <input
                    type="text"
                    placeholder="e.g. TylerHats or https://steamcommunity.com/id/TylerHats or 765611980..."
                    value={steamId64}
                    onChange={e => setSteamId64(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Games Showcase Display Mode</label>
                  <select
                    value={steamDisplayMode}
                    onChange={e => setSteamDisplayMode(e.target.value as any)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                  >
                    <option value="both">Top 3 Recently Played + Top 3 All-Time Games (Both)</option>
                    <option value="recently_played">Top 3 Recently Played Games (Past 2 Weeks Only)</option>
                    <option value="top_games">Top 3 All-Time Games (Lifetime Hours Only)</option>
                    <option value="none">Hide Games List (Show Avatar & Status Only)</option>
                  </select>
                </div>
              </div>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--accent-color)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                💡 <strong>Flexible Steam Format:</strong> You can paste your 64-bit ID, custom handle (e.g. <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>TylerHats</code>), or full profile URL! WebNook automatically resolves vanity names and fetches real-time stats.
              </div>
            </div>
          </div>

          {/* Multi-Track Music Playlist Manager */}
          <div className="nook-panel">
            <div className="nook-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Music size={20} style={{ flexShrink: 0 }} />
              <span>Multi-Track Music Playlist Manager ({musicTracks.length} tracks)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Form: Add New Streaming Track (Spotify / Apple Music) */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Add Streaming Track (Spotify or Apple Music):</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
                  <select
                    value={newTrackType}
                    onChange={e => setNewTrackType(e.target.value as any)}
                    style={{ padding: '0.55rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  >
                    <option value="spotify">Spotify</option>
                    <option value="apple">Apple Music</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Track Title (e.g. Midnight City)"
                    value={newTrackTitle}
                    onChange={e => setNewTrackTitle(e.target.value)}
                    style={{ padding: '0.55rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />

                  <input
                    type="url"
                    placeholder={newTrackType === 'spotify' ? 'https://open.spotify.com/track/...' : 'https://music.apple.com/...'}
                    value={newTrackUrl}
                    onChange={e => setNewTrackUrl(e.target.value)}
                    style={{ padding: '0.55rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />

                  <button
                    type="button"
                    onClick={handleAddTrack}
                    className="btn-primary"
                    style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Plus size={16} />
                    <span>Add Track</span>
                  </button>
                </div>
              </div>

              {/* Upload Custom MP3 Track */}
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Upload Audio File to Playlist (MP3 / WAV / OGG)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Audio Track Title"
                    value={bgMusicTitle}
                    onChange={e => setBgMusicTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                  <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}>
                    <Upload size={16} />
                    <span>{audioFileName || 'Choose Audio File (MP3/WAV)...'}</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setAudioFileName(f.name);
                          handleMusicFileUpload(f);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {/* Playlist Tracks List */}
              {musicTracks.length > 0 ? (
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.8, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Current Playlist Draft ({musicTracks.length} tracks):</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {musicTracks.map((tr, idx) => (
                      <div key={tr.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.6 }}>#{idx + 1}</span>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tr.title}</span>
                          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.7, background: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.5rem', borderRadius: '10px' }}>
                            {tr.type}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {idx === 0 && tr.type === 'audio' && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...musicTracks];
                                updated[0] = { ...updated[0], autoplay: !updated[0].autoplay };
                                setMusicTracks(updated);
                              }}
                              style={{
                                background: tr.autoplay ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                                color: tr.autoplay ? '#ffffff' : 'var(--text-main)',
                                border: tr.autoplay ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                                borderRadius: '4px',
                                padding: '0.2rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontWeight: 600
                              }}
                              title={tr.autoplay ? 'Autoplay Enabled on Nook Load' : 'Enable Autoplay on Nook Load'}
                            >
                              <Volume2 size={13} />
                              <span>{tr.autoplay ? 'Autoplay On' : 'Autoplay Off'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleMoveTrack(idx, 'up')}
                            disabled={idx === 0}
                            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveTrack(idx, 'down')}
                            disabled={idx === musicTracks.length - 1}
                            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: idx === musicTracks.length - 1 ? 'default' : 'pointer', opacity: idx === musicTracks.length - 1 ? 0.3 : 1 }}
                            title="Move Down"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveTrack(idx)}
                            style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                            title="Remove Track"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* All-MP3 Playlist Playback Settings (Auto Next Play & Loop) */}
                  {musicTracks.every(t => t.type === 'audio') && (
                    <div style={{
                      marginTop: '0.85rem',
                      padding: '0.85rem 1rem',
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem'
                    }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Volume2 size={16} />
                        <span>All-MP3 Playlist Audio Settings</span>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={autoNextPlay}
                          onChange={e => setAutoNextPlay(e.target.checked)}
                        />
                        <span>⏭️ <strong>Auto Next Play:</strong> Automatically start playing the next track when current MP3 finishes</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={loopPlaylist}
                          onChange={e => setLoopPlaylist(e.target.checked)}
                        />
                        <span>🔁 <strong>Loop Playlist:</strong> Restart and play the first track after the last track finishes</span>
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', opacity: 0.6, textAlign: 'center', margin: 0, padding: '0.5rem' }}>
                  No tracks in playlist yet. Add Spotify or Apple Music tracks above!
                </p>
              )}

              {/* Search Spotify Catalog Popover Trigger */}
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--accent-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Search Spotify Track Catalog 🔍</div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>Find any track on Spotify and add it to your playlist automatically!</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSpotifySearch(!showSpotifySearch)}
                  className="btn-primary"
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                >
                  {showSpotifySearch ? 'Close Search' : 'Search Spotify Catalog'}
                </button>
              </div>

              {/* Spotify Search Input & Modal Grid */}
              {showSpotifySearch && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      placeholder="Search song title or artist..."
                      value={spotifySearchQ}
                      onChange={e => setSpotifySearchQ(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearchSpotify()}
                      style={{ flex: 1, minWidth: 0, padding: '0.55rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                    />
                    <button type="button" onClick={handleSearchSpotify} className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}>
                      Search
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {spotifyResults.map(tr => (
                      <div key={tr.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.65rem', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <img src={tr.albumCover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'} alt="" style={{ width: '32px', height: '32px', borderRadius: '4px' }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{tr.title}</div>
                            <div style={{ fontSize: '0.72rem', opacity: 0.6 }}>{tr.artist}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setMusicTracks(prev => [...prev, { id: `sp_${Date.now()}`, title: `${tr.title} - ${tr.artist}`, type: 'spotify', url: tr.spotifyUrl }]);
                            showToast(`Added "${tr.title}" to playlist!`, 'success');
                          }}
                          className="btn-primary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          + Add to Playlist
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spotify Playback Explanation Box */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                💡 <strong>Note on Spotify & Streaming Track Playback:</strong>
                <p style={{ marginTop: '0.3rem', opacity: 0.85 }}>
                  Due to Spotify licensing regulations, Spotify web embeds play a <strong>30-second audio preview clip</strong> for visitors unless the visitor is logged into Spotify in their browser. For guaranteed 100% full track playback for all visitors, upload your custom MP3 file above!
                </p>
              </div>
            </div>
          </div>

          {/* Movies & TV Showcase Panel */}
          <div className="nook-panel">
            <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🎬 Movies & TV Showcase Manager ({favoriteMovies.length} items)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMoviesSearch(!showMoviesSearch)}
                className="btn-primary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                {showMoviesSearch ? 'Close Search' : 'Search Movies & TV Shows 🍿'}
              </button>
            </div>

            {/* Movies Search Popover */}
            {showMoviesSearch && (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="Search movie or TV show title..."
                    value={moviesSearchQ}
                    onChange={e => setMoviesSearchQ(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchMovies()}
                    style={{ flex: 1, minWidth: 0, padding: '0.55rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <button type="button" onClick={handleSearchMovies} className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}>
                    Search
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', maxHeight: '240px', overflowY: 'auto' }}>
                  {moviesResults.map(m => (
                    <div key={m.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                      <img src={m.posterUrl} alt="" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.3rem' }} />
                      <div style={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{m.type} • {m.year}</div>
                      <button
                        type="button"
                        onClick={() => {
                          setFavoriteMovies(prev => [...prev, m]);
                          showToast(`Added "${m.title}" to favorites!`, 'success');
                        }}
                        className="btn-primary"
                        style={{ width: '100%', padding: '0.2rem', fontSize: '0.72rem', marginTop: '0.4rem' }}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Favorite Movies List */}
            {favoriteMovies.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 135px)', gap: '0.75rem' }}>
                {favoriteMovies.map((m, idx) => (
                  <div key={m.id || idx} style={{ background: 'rgba(0,0,0,0.25)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setFavoriteMovies(favoriteMovies.filter((_, i) => i !== idx))}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(239, 68, 68, 0.8)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '0.75rem', zIndex: 2 }}
                    >
                      ✕
                    </button>
                    <img src={m.posterUrl} alt="" style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.3rem' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{m.type} • {m.year}</div>
                    <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={!!m.inProgress}
                          onChange={e => {
                            const checked = e.target.checked;
                            setFavoriteMovies(prev => prev.map((item, i) => i === idx ? { ...item, inProgress: checked, onMyList: checked ? false : item.onMyList } : item));
                          }}
                        />
                        <span>In Progress 🍿</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={!!m.onMyList}
                          onChange={e => {
                            const checked = e.target.checked;
                            setFavoriteMovies(prev => prev.map((item, i) => i === idx ? { ...item, onMyList: checked, inProgress: checked ? false : item.inProgress } : item));
                          }}
                        />
                        <span>On My List 📌</span>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', opacity: (m.inProgress || m.onMyList) ? 0.4 : 1, marginTop: '0.1rem' }}>
                        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Star Rating:</span>
                        <input
                          type="text"
                          placeholder="5.0"
                          disabled={!!m.inProgress || !!m.onMyList}
                          value={m.rating !== undefined && m.rating !== null ? m.rating : ''}
                          onChange={e => {
                            const val = e.target.value;
                            setFavoriteMovies(prev => prev.map((item, i) => i === idx ? { ...item, rating: val } : item));
                          }}
                          style={{ width: '45px', padding: '0.1rem 0.3rem', fontSize: '0.72rem', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#facc15', fontWeight: 700 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ opacity: 0.6, fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>No movies or TV shows added yet. Search above! 🎬</p>
            )}
          </div>

          {/* Books Showcase & Reading Nook Manager */}
          <div className="nook-panel">
            <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📖 Reading Nook & Favorite Books ({favoriteBooks.length} books)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBooksSearch(!showBooksSearch)}
                className="btn-primary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                {showBooksSearch ? 'Close Search' : 'Search Books 📚'}
              </button>
            </div>

            {/* StoryGraph Profile Handle & CSV Import */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>StoryGraph Username / Handle</label>
                <input
                  type="text"
                  placeholder="e.g. tylerhats"
                  value={storygraphUsername}
                  onChange={e => setStorygraphUsername(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Import StoryGraph Library CSV</label>
                <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}>
                  <FileText size={15} />
                  <span>{csvFileName || 'Choose StoryGraph CSV File...'}</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setCsvFileName(f.name);
                        handleStoryGraphCsvUpload(f);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            {/* Books Search Popover */}
            {showBooksSearch && (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="Search book title or author..."
                    value={booksSearchQ}
                    onChange={e => setBooksSearchQ(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchBooks()}
                    style={{ flex: 1, minWidth: 0, padding: '0.55rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <button type="button" onClick={handleSearchBooks} className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}>
                    Search
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', maxHeight: '240px', overflowY: 'auto' }}>
                  {booksResults.map(b => (
                    <div key={b.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                      <img src={b.coverUrl} alt="" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.3rem' }} />
                      <div style={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{b.author}</div>
                      <button
                        type="button"
                        onClick={() => {
                          setFavoriteBooks(prev => [...prev, b]);
                          showToast(`Added "${b.title}" to books!`, 'success');
                        }}
                        className="btn-primary"
                        style={{ width: '100%', padding: '0.2rem', fontSize: '0.72rem', marginTop: '0.4rem' }}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Favorite Books List */}
            {favoriteBooks.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 135px)', gap: '0.75rem' }}>
                {favoriteBooks.map((b, idx) => (
                  <div key={b.id || idx} style={{ background: 'rgba(0,0,0,0.25)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setFavoriteBooks(favoriteBooks.filter((_, i) => i !== idx))}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(239, 68, 68, 0.8)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '0.75rem', zIndex: 2 }}
                    >
                      ✕
                    </button>
                    <img src={b.coverUrl} alt="" style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.3rem' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{b.author}</div>
                    <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={!!b.inProgress}
                          onChange={e => {
                            const checked = e.target.checked;
                            setFavoriteBooks(prev => prev.map((item, i) => i === idx ? { ...item, inProgress: checked, onMyList: checked ? false : item.onMyList } : item));
                          }}
                        />
                        <span>In Progress 📖</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={!!b.onMyList}
                          onChange={e => {
                            const checked = e.target.checked;
                            setFavoriteBooks(prev => prev.map((item, i) => i === idx ? { ...item, onMyList: checked, inProgress: checked ? false : item.inProgress } : item));
                          }}
                        />
                        <span>On My List 📌</span>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', opacity: (b.inProgress || b.onMyList) ? 0.4 : 1, marginTop: '0.1rem' }}>
                        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Star Rating:</span>
                        <input
                          type="text"
                          placeholder="5.0"
                          disabled={!!b.inProgress || !!b.onMyList}
                          value={b.rating !== undefined && b.rating !== null ? b.rating : ''}
                          onChange={e => {
                            const val = e.target.value;
                            setFavoriteBooks(prev => prev.map((item, i) => i === idx ? { ...item, rating: val } : item));
                          }}
                          style={{ width: '45px', padding: '0.1rem 0.3rem', fontSize: '0.72rem', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#facc15', fontWeight: 700 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ opacity: 0.6, fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>No books added to your reading nook yet. Search or import CSV above! 📖</p>
            )}
          </div>

          {/* Visual Sticker Studio & Badges Layer */}
          <div className="nook-panel">
            <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={20} style={{ flexShrink: 0 }} />
                <span>Visual Sticker Studio & Custom Uploads</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleSave();
                  setShowStickerStudio(true);
                }}
                className="btn-primary"
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Sparkles size={16} />
                <span>Open Visual Sticker Studio</span>
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
              Click <strong>Open Visual Sticker Studio</strong> above to launch a live interactive editor where you can drag, scale, rotate, and assign sticker layers over your Nook layout!
            </p>

            {/* Custom Sticker Upload */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>Upload Custom Sticker Image (PNG / GIF / SVG / WebP)</label>
                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Uploaded custom stickers appear automatically in your Visual Sticker Studio.</span>
              </div>
              <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 0.85rem', fontSize: '0.85rem', alignSelf: 'flex-start' }}>
                <Upload size={16} />
                <span>{stickerFileName || 'Choose Custom Sticker Image...'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setStickerFileName(f.name);
                      setCropModal({ isOpen: true, file: f, title: 'Crop Custom Sticker Image', aspectRatio: 1, target: 'sticker' });
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Preset Sticker Pickers */}
            <div style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.7, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Preset Stickers Library:
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {PRESET_STICKERS.map((st) => {
                const isEmoji = !st.url.startsWith('/') && !st.url.startsWith('http') && !st.url.startsWith('data:');
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleAddSticker(st.url)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.5rem 0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'var(--text-main)'
                    }}
                  >
                    {isEmoji ? (
                      <span style={{ fontSize: '1.4rem', display: 'inline-flex', alignItems: 'center' }}>{st.url}</span>
                    ) : (
                      <img src={st.url} alt={st.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                    )}
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{st.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Canvas Stickers List */}
            {stickers.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Active Canvas Stickers ({stickers.length}):</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {stickers.map((st: Sticker, idx: number) => {
                    const isEmoji = !st.sticker_url.startsWith('/') && !st.sticker_url.startsWith('http') && !st.sticker_url.startsWith('data:');
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {isEmoji ? (
                            <span style={{ fontSize: '1.4rem', display: 'inline-flex', alignItems: 'center' }}>{st.sticker_url}</span>
                          ) : (
                            <img src={st.sticker_url} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                          )}
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sticker #{idx + 1}</span>
                          <span style={{ fontSize: '0.75rem', opacity: 0.6, background: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.5rem', borderRadius: '10px' }}>
                            Layer: {st.layer === 'behind_cards' ? 'Behind Cards' : 'Above Cards'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStickerLayer(idx)}
                            className="btn-secondary"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            Toggle Layer
                          </button>
                          <Trash2 size={16} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => handleRemoveSticker(idx)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Custom CSS Editor */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Code size={20} />
              <span>Custom CSS Overrides</span>
            </div>
            <textarea
              rows={5}
              placeholder="/* Inject custom CSS rules for your Nook! */&#10;.nook-panel { border-color: #ff007f; }"
              value={customCss}
              onChange={e => setCustomCss(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                borderRadius: 'var(--border-radius-btn)',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                color: '#22c55e'
              }}
            />
          </div>
        </div>
      </div>

      <ImageCropModal
        isOpen={cropModal.isOpen}
        imageFile={cropModal.file}
        title={cropModal.title}
        aspectRatio={cropModal.aspectRatio}
        onCropComplete={(croppedFile) => {
          if (cropModal.target === 'avatar') {
            handleAvatarFileUpload(croppedFile);
          } else if (cropModal.target === 'banner') {
            handleBannerFileUpload(croppedFile);
          } else if (cropModal.target === 'sticker') {
            handleCustomStickerUpload(croppedFile);
          }
        }}
        onClose={() => setCropModal({ ...cropModal, isOpen: false, file: null })}
      />
    </div>
  );
};
