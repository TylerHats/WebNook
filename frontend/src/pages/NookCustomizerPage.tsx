import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Palette, Sparkles, Image, Music, Eye, Code, Plus, Trash2, Save, Gamepad2, Layers, CheckSquare, Volume2, Upload, FileText, ArrowUp, ArrowDown } from 'lucide-react';
import { StickerCanvas, Sticker } from '../components/nook/StickerCanvas';
import { PRESET_STICKERS } from '../constants/presetStickers';

import { VisualStickerStudioModal } from '../components/nook/VisualStickerStudioModal';
import { MusicTrack } from '../components/widgets/MusicWidget';
import { HobbiesWidget, HobbyItem } from '../components/widgets/HobbiesWidget';
import { ImageCropModal } from '../components/ui/ImageCropModal';
import { CustomSelect } from '../components/ui/CustomSelect';
import { MarkdownRenderer } from '../components/ui/MarkdownRenderer';
import { ThemeBookshelfPicker } from '../components/nook/ThemeBookshelfPicker';
import { ThemeDefinition, ThemePalette } from '../themes/types';
import { playThemeSound } from '../utils/themeSoundEngine';
import { ThemeAnimationOverlay } from '../components/nook/ThemeAnimationOverlay';

export interface NookCardConfig {
  id: string;
  type: 'bio' | 'music' | 'friends' | 'guestbook' | 'steam' | 'movies' | 'books' | 'hobbies' | 'markdown' | 'html';
  title?: string;
  icon?: string;
  enabled: boolean;
  content_markdown?: string;
  content_html?: string;
  photo_urls?: string[];
  favorite_movies?: any[];
  favorite_books?: any[];
  music_tracks?: any[];
  hobbies?: any[];
  steam_id64?: string;
  steam_display_mode?: 'none' | 'recently_played' | 'top_games' | 'both';
}

const DEFAULT_CARD_LAYOUT: NookCardConfig[] = [
  { id: 'c_bio', type: 'bio', title: 'About Me', enabled: true },
  { id: 'c_music', type: 'music', title: 'My Music Playlist', enabled: true },
  { id: 'c_friends', type: 'friends', title: 'Top Friends', enabled: true },
  { id: 'c_hobbies', type: 'hobbies', title: 'Hobbies & Passions', enabled: true },
  { id: 'c_movies', type: 'movies', title: 'Movies & TV Favorites', enabled: true },
  { id: 'c_books', type: 'books', title: 'Reading Nook & Books', enabled: true },
  { id: 'c_steam', type: 'steam', title: 'Steam Showcase', enabled: true }
];

export const NookCustomizerPage: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [theme, setTheme] = useState('glassmorphism');
  const [savedTheme, setSavedTheme] = useState('glassmorphism');
  const [visibilityNook, setVisibilityNook] = useState('private');
  const [cardLayout, setCardLayout] = useState<NookCardConfig[]>(DEFAULT_CARD_LAYOUT);

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

  const [hobbies, setHobbies] = useState<HobbyItem[]>([]);
  const [customCss, setCustomCss] = useState('');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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
            setSavedTheme(data.nookSettings.theme || 'glassmorphism');
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

            if (data.nookSettings.hobbies_json) {
              try {
                const parsed = typeof data.nookSettings.hobbies_json === 'string'
                  ? JSON.parse(data.nookSettings.hobbies_json)
                  : data.nookSettings.hobbies_json;
                if (Array.isArray(parsed)) setHobbies(parsed);
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

            if (data.nookSettings.card_layout_json) {
              try {
                const parsedLayout = typeof data.nookSettings.card_layout_json === 'string'
                  ? JSON.parse(data.nookSettings.card_layout_json)
                  : data.nookSettings.card_layout_json;
                if (Array.isArray(parsedLayout) && parsedLayout.length > 0) {
                  const initMovies = data.nookSettings.favorite_movies_json ? (typeof data.nookSettings.favorite_movies_json === 'string' ? JSON.parse(data.nookSettings.favorite_movies_json) : data.nookSettings.favorite_movies_json) : [];
                  const initBooks = data.nookSettings.favorite_books_json ? (typeof data.nookSettings.favorite_books_json === 'string' ? JSON.parse(data.nookSettings.favorite_books_json) : data.nookSettings.favorite_books_json) : [];
                  let initTracks: any[] = [];
                  if (data.nookSettings.music_tracks_json) {
                    const p = typeof data.nookSettings.music_tracks_json === 'string' ? JSON.parse(data.nookSettings.music_tracks_json) : data.nookSettings.music_tracks_json;
                    initTracks = Array.isArray(p) ? p : (p?.tracks || []);
                  }
                  const initHobbies = data.nookSettings.hobbies_json ? (typeof data.nookSettings.hobbies_json === 'string' ? JSON.parse(data.nookSettings.hobbies_json) : data.nookSettings.hobbies_json) : [];

                  const initializedLayout = parsedLayout.map((c: any, idx: number) => {
                    const cardCopy = { ...c };
                    const firstMoviesIdx = parsedLayout.findIndex((item: any) => item.type === 'movies');
                    const firstBooksIdx = parsedLayout.findIndex((item: any) => item.type === 'books');
                    const firstMusicIdx = parsedLayout.findIndex((item: any) => item.type === 'music');
                    const firstHobbiesIdx = parsedLayout.findIndex((item: any) => item.type === 'hobbies');

                    if (cardCopy.type === 'movies') {
                      if (!cardCopy.favorite_movies) {
                        cardCopy.favorite_movies = idx === firstMoviesIdx ? [...initMovies] : [];
                      }
                    }
                    if (cardCopy.type === 'books') {
                      if (!cardCopy.favorite_books) {
                        cardCopy.favorite_books = idx === firstBooksIdx ? [...initBooks] : [];
                      }
                    }
                    if (cardCopy.type === 'music') {
                      if (!cardCopy.music_tracks) {
                        cardCopy.music_tracks = idx === firstMusicIdx ? [...initTracks] : [];
                      }
                    }
                    if (cardCopy.type === 'hobbies') {
                      if (!cardCopy.hobbies) {
                        cardCopy.hobbies = idx === firstHobbiesIdx ? [...initHobbies] : [];
                      }
                    }
                    if (cardCopy.type === 'steam') {
                      if (!cardCopy.steam_id64) cardCopy.steam_id64 = data.nookSettings.steam_id64 || '';
                      if (!cardCopy.steam_display_mode) cardCopy.steam_display_mode = data.nookSettings.steam_display_mode || 'both';
                    }
                    return cardCopy;
                  });
                  setCardLayout(initializedLayout.filter((c: any) => c.type !== 'guestbook'));
                }
              } catch (e) {}
            }
          }
          if (data.stickers) {
            setStickers(data.stickers);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setIsInitialLoaded(true));
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

  const handleSave = async (silent = false, themeToSave?: string) => {
    if (!token) return;
    setIsSaving(true);

    const activeThemeToPersist = themeToSave || savedTheme;

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
          theme: activeThemeToPersist,
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
          hobbies_json: hobbies,
          card_layout_json: cardLayout,
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
        if (!silent) showToast('Nook customized successfully!', 'success');
      } else {
        if (!silent) showToast('Failed to save customization', 'error');
      }
    } catch (e) {
      if (!silent) showToast('Error saving customization', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCommitTheme = async (targetThemeId: string, palette: ThemePalette) => {
    setSavedTheme(targetThemeId);
    setTheme(targetThemeId);
    handleApplyPalette(palette);
    await handleSave(false, targetThemeId);
  };

  // Debounced Autosave Effect (Theme swaps require deliberate save action)
  useEffect(() => {
    if (!isInitialLoaded) return;

    setAutosaveStatus('saving');
    const timer = setTimeout(async () => {
      await handleSave(true);
      setAutosaveStatus('saved');
      setTimeout(() => setAutosaveStatus('idle'), 2500);
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    visibilityNook, bgColor, cardBgColor, accentColor, textColor, borderColor,
    steamId64, steamDisplayMode, spotifyTrackUrl, appleMusicUrl, bgMusicUrl, bgMusicTitle,
    musicTracks, autoNextPlay, loopPlaylist, cardVisibility, cardTitles, favoriteMovies,
    favoriteBooks, storygraphUsername, themeSoundsEnabled, themeAnimationsEnabled,
    hobbies, customCss, stickers, cardLayout
  ]);

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

  const handleGlobalClick = (e: React.MouseEvent) => {
    if (themeSoundsEnabled) {
      playThemeSound(theme, themeSoundsEnabled, 'click', { x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div className={`theme-${theme}`} style={customStyle} onClick={handleGlobalClick}>
      {/* Theme Animation Overlay in Customizer Live Preview */}
      {themeAnimationsEnabled && <ThemeAnimationOverlay theme={theme} />}

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginTop: '0.25rem' }}>
            {autosaveStatus === 'saving' && (
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Sparkles size={14} /> Autosaving...
              </span>
            )}
            {autosaveStatus === 'saved' && (
              <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                ✓ Autosaved
              </span>
            )}
            <button onClick={() => handleSave(false)} className="btn-primary" disabled={isSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Save size={18} style={{ flexShrink: 0 }} />
              <span>{isSaving ? 'Saving...' : 'Save Nook'}</span>
            </button>
          </div>
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

            <div style={{ marginBottom: '1.5rem' }}>
              <ThemeBookshelfPicker
                currentSavedThemeId={savedTheme}
                stagedThemeId={theme}
                onStageTheme={(selectedThemeObj) => {
                  setTheme(selectedThemeObj.id);
                  handleApplyPalette(selectedThemeObj.palette);
                }}
                onCommitTheme={(targetThemeId, palette) => {
                  handleCommitTheme(targetThemeId, palette);
                }}
                isSaving={isSaving}
              />
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

          {/* Nook Card & Widget Ordering Manager */}
          <div className="nook-panel">
            <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={20} color="var(--accent-color)" />
                <span>Nook Card Layout & Order Manager</span>
              </div>
              <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>({cardLayout.length} Cards Total)</span>
            </div>

            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
              Drag or use <strong>Up ▲ / Down ▼</strong> buttons to reorder your cards in the exact sequence they display on your Nook. You can add custom Markdown/HTML cards or duplicate preformatted cards anytime!
            </p>

            {/* Quick Add Card Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const newCard: NookCardConfig = {
                    id: `c_md_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    type: 'markdown',
                    title: 'My Custom Note',
                    enabled: true,
                    content_markdown: '### ✨ Welcome to my Nook!\nWrite your custom markdown text or upload photos here...'
                  };
                  setCardLayout(prev => [...prev, newCard]);
                  showToast('Added Custom Markdown Card!', 'info');
                }}
                style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <FileText size={16} />
                <span>+ Add Custom Markdown Card</span>
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const newCard: NookCardConfig = {
                    id: `c_html_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    type: 'html',
                    title: 'My Custom HTML Embed',
                    enabled: true,
                    content_html: '<div style="padding: 1rem; text-align: center; background: rgba(99,102,241,0.1); border-radius: 8px;">\n  <h3 style="margin:0; color:#6366f1;">✨ Custom HTML Card</h3>\n  <p>Input raw HTML, embeds, or custom widgets here!</p>\n</div>'
                  };
                  setCardLayout(prev => [...prev, newCard]);
                  showToast('Added Custom HTML Card!', 'info');
                }}
                style={{ padding: '0.45rem 0.8rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}
              >
                <Code size={16} />
                <span>+ Add Custom HTML Card</span>
              </button>

              {/* Add Preformatted Card Dropdown */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <CustomSelect
                  value=""
                  variant="btn-primary"
                  onChange={(val: string | number) => {
                    const strVal = String(val);
                    if (!strVal) return;
                    const labels: Record<string, string> = {
                      bio: 'About Me',
                      music: 'My Music Playlist',
                      friends: 'Top Friends',
                      hobbies: 'Hobbies & Passions',
                      movies: 'Movies & TV Favorites',
                      books: 'Reading Nook & Books',
                      steam: 'Steam Showcase',
                      guestbook: 'Guestbook Notes'
                    };
                    const newCard: NookCardConfig = {
                      id: `c_${strVal}_${Date.now()}`,
                      type: strVal as any,
                      title: labels[strVal] || 'Card',
                      enabled: true,
                      favorite_movies: strVal === 'movies' ? [] : undefined,
                      favorite_books: strVal === 'books' ? [] : undefined,
                      music_tracks: strVal === 'music' ? [] : undefined,
                      hobbies: strVal === 'hobbies' ? [] : undefined,
                      steam_id64: strVal === 'steam' ? steamId64 : undefined,
                      steam_display_mode: strVal === 'steam' ? steamDisplayMode : undefined
                    };
                    setCardLayout(prev => [...prev, newCard]);
                    showToast(`Added ${labels[strVal] || 'Card'} Card!`, 'info');
                  }}
                  placeholder="+ Add Preformatted Card..."
                  options={[
                    { value: 'bio', label: '📝 About Me / Bio Card' },
                    { value: 'music', label: '🎵 Profile Anthem & Music Player' },
                    { value: 'friends', label: '👥 Top Friends Grid' },
                    { value: 'hobbies', label: '🎯 Hobbies & Passions' },
                    { value: 'movies', label: '🍿 Movies & TV Showcase' },
                    { value: 'books', label: '📖 Reading Nook & Books' },
                    { value: 'steam', label: '🎮 Steam Gaming Showcase' }
                  ]}
                  style={{ minWidth: '210px' }}
                />
              </div>
            </div>

            {/* Reorderable List of Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {cardLayout.map((c, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === cardLayout.length - 1;

                return (
                  <div
                    key={c.id}
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 auto', minWidth: 0, flexWrap: 'wrap' }}>
                      {/* Up / Down reorder controls */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => {
                            const updated = [...cardLayout];
                            const temp = updated[idx];
                            updated[idx] = updated[idx - 1];
                            updated[idx - 1] = temp;
                            setCardLayout(updated);
                          }}
                          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: isFirst ? 'rgba(255,255,255,0.2)' : '#fff', cursor: isFirst ? 'default' : 'pointer', padding: '2px 5px', borderRadius: '4px', fontSize: '0.7rem' }}
                          title="Move Card Up"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => {
                            const updated = [...cardLayout];
                            const temp = updated[idx];
                            updated[idx] = updated[idx + 1];
                            updated[idx + 1] = temp;
                            setCardLayout(updated);
                          }}
                          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: isLast ? 'rgba(255,255,255,0.2)' : '#fff', cursor: isLast ? 'default' : 'pointer', padding: '2px 5px', borderRadius: '4px', fontSize: '0.7rem' }}
                          title="Move Card Down"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>

                    {/* Enable Checkbox */}
                    <input
                      type="checkbox"
                      checked={c.enabled !== false}
                      onChange={e => {
                        const updated = [...cardLayout];
                        updated[idx].enabled = e.target.checked;
                        setCardLayout(updated);
                      }}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)', cursor: 'pointer', flexShrink: 0 }}
                    />

                    {/* Card Type Badge */}
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.45rem', borderRadius: '6px', background: c.type === 'markdown' ? 'rgba(56,189,248,0.2)' : c.type === 'html' ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.1)', color: c.type === 'markdown' ? '#38bdf8' : c.type === 'html' ? '#c084fc' : 'var(--text-main)', flexShrink: 0 }}>
                      {c.type.toUpperCase()}
                    </span>

                    {/* Card Title Input */}
                    <input
                      type="text"
                      placeholder="Card Title Header..."
                      value={c.title || ''}
                      onChange={e => {
                        const updated = [...cardLayout];
                        updated[idx].title = e.target.value;
                        setCardLayout(updated);
                      }}
                      style={{ flex: '1 1 120px', minWidth: 0, padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Delete Card Button */}
                    <button
                      type="button"
                      onClick={() => setCardLayout(cardLayout.filter((_, i) => i !== idx))}
                      style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '6px', padding: '0.35rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      title="Remove Card"
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          {/* Dynamic Card Showcase Panels (Dedicated Editor for EVERY Card in cardLayout) */}
          {cardLayout.map((c, cIdx) => {
            const cardNumLabel = `Card #${cIdx + 1}: ${c.title || c.type.toUpperCase()}`;

            const updateCardMovies = (newMovies: any[]) => {
              const updated = [...cardLayout];
              updated[cIdx].favorite_movies = newMovies;
              setCardLayout(updated);
              if (cIdx === cardLayout.findIndex(item => item.type === 'movies')) setFavoriteMovies(newMovies);
            };

            const updateCardBooks = (newBooks: any[]) => {
              const updated = [...cardLayout];
              updated[cIdx].favorite_books = newBooks;
              setCardLayout(updated);
              if (cIdx === cardLayout.findIndex(item => item.type === 'books')) setFavoriteBooks(newBooks);
            };

            const updateCardMusic = (newTracks: any[]) => {
              const updated = [...cardLayout];
              updated[cIdx].music_tracks = newTracks;
              setCardLayout(updated);
              if (cIdx === cardLayout.findIndex(item => item.type === 'music')) setMusicTracks(newTracks);
            };

            const updateCardHobbies = (newHobbies: any[]) => {
              const updated = [...cardLayout];
              updated[cIdx].hobbies = newHobbies;
              setCardLayout(updated);
              if (cIdx === cardLayout.findIndex(item => item.type === 'hobbies')) setHobbies(newHobbies);
            };

            if (c.type === 'steam') {
              return (
                <div key={c.id} className="nook-panel">
                  <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Gamepad2 size={20} />
                      <span>🎮 Steam Gaming Showcase ({cardNumLabel})</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
                    Enter any Steam username/display name, 64-bit Steam ID, or Steam profile URL to show live avatar, status, and games:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Steam Username / Profile ID / URL:</label>
                      <input
                        type="text"
                        placeholder="e.g. TylerHats, 76561198000000000, or https://steamcommunity.com/id/TylerHats"
                        value={c.steam_id64 !== undefined ? c.steam_id64 : steamId64}
                        onChange={e => {
                          const updated = [...cardLayout];
                          updated[cIdx].steam_id64 = e.target.value;
                          setCardLayout(updated);
                          if (cIdx === cardLayout.findIndex(item => item.type === 'steam')) setSteamId64(e.target.value);
                        }}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Display Mode:</label>
                      <select
                        value={c.steam_display_mode !== undefined ? c.steam_display_mode : steamDisplayMode}
                        onChange={e => {
                          const updated = [...cardLayout];
                          updated[cIdx].steam_display_mode = e.target.value as any;
                          setCardLayout(updated);
                          if (cIdx === cardLayout.findIndex(item => item.type === 'steam')) setSteamDisplayMode(e.target.value as any);
                        }}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                      >
                        <option value="both">Top 3 Recently Played + Top 3 All-Time Games (Both)</option>
                        <option value="recently_played">Top 3 Recently Played Games (Past 2 Weeks Only)</option>
                        <option value="top_games">Top 3 All-Time Games (Lifetime Hours Only)</option>
                        <option value="none">Hide Games List (Show Avatar & Status Only)</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            }

            if (c.type === 'music') {
              const cardTracks = c.music_tracks || (cIdx === cardLayout.findIndex(item => item.type === 'music') ? musicTracks : []);
              return (
                <div key={c.id} className="nook-panel">
                  <div className="nook-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Music size={20} />
                      <span>🎵 Profile Music Playlist ({cardNumLabel} - {cardTracks.length} tracks)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Add Streaming Track */}
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
                          onClick={() => {
                            if (!newTrackUrl) return;
                            const newTr: MusicTrack = {
                              id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                              title: newTrackTitle.trim() || 'Track',
                              type: newTrackType,
                              url: newTrackUrl.trim()
                            };
                            updateCardMusic([...cardTracks, newTr]);
                            setNewTrackTitle('');
                            setNewTrackUrl('');
                            showToast('Track added to playlist!', 'success');
                          }}
                          className="btn-primary"
                          style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Plus size={16} />
                          <span>Add Track</span>
                        </button>
                      </div>
                    </div>

                    {/* Upload Audio File */}
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Upload Audio File to Playlist (MP3 / WAV)</label>
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
                          <span>{audioFileName || 'Choose Audio File...'}</span>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f || !token) return;
                              setAudioFileName(f.name);
                              const formData = new FormData();
                              formData.append('music', f);
                              try {
                                const res = await fetch('/api/nook/upload/music', {
                                  method: 'POST',
                                  headers: { Authorization: `Bearer ${token}` },
                                  body: formData
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  const track: MusicTrack = {
                                    id: `tr_${Date.now()}`,
                                    title: bgMusicTitle.trim() || f.name,
                                    type: 'audio',
                                    url: data.music_url,
                                    autoplay: false
                                  };
                                  updateCardMusic([...cardTracks, track]);
                                  setBgMusicTitle('');
                                  showToast('Audio file uploaded to card playlist!', 'success');
                                } else {
                                  showToast(data.error || 'Audio upload failed', 'error');
                                }
                              } catch (err) {
                                showToast('Error uploading audio file', 'error');
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Playlist Tracks Grid */}
                    {cardTracks.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {cardTracks.map((tr: any, trIdx: number) => (
                          <div key={tr.id || trIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.6 }}>#{trIdx + 1}</span>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tr.title}</span>
                              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.7, background: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.5rem', borderRadius: '10px' }}>{tr.type}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <button
                                type="button"
                                disabled={trIdx === 0}
                                onClick={() => {
                                  const updated = [...cardTracks];
                                  const temp = updated[trIdx];
                                  updated[trIdx] = updated[trIdx - 1];
                                  updated[trIdx - 1] = temp;
                                  updateCardMusic(updated);
                                }}
                                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: trIdx === 0 ? 'default' : 'pointer', opacity: trIdx === 0 ? 0.3 : 1 }}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={trIdx === cardTracks.length - 1}
                                onClick={() => {
                                  const updated = [...cardTracks];
                                  const temp = updated[trIdx];
                                  updated[trIdx] = updated[trIdx + 1];
                                  updated[trIdx + 1] = temp;
                                  updateCardMusic(updated);
                                }}
                                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: trIdx === cardTracks.length - 1 ? 'default' : 'pointer', opacity: trIdx === cardTracks.length - 1 ? 0.3 : 1 }}
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  updateCardMusic(cardTracks.filter((_: any, i: number) => i !== trIdx));
                                }}
                                style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ opacity: 0.6, fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>No tracks in playlist yet. Add Spotify or Apple Music tracks above! 🎵</p>
                    )}
                  </div>
                </div>
              );
            }

            if (c.type === 'movies') {
              const cardMovies = c.favorite_movies || (cIdx === cardLayout.findIndex(item => item.type === 'movies') ? favoriteMovies : []);
              return (
                <div key={c.id} className="nook-panel">
                  <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span>🎬 Movies & TV Showcase ({cardNumLabel} - {cardMovies.length} items)</span>
                    <button
                      type="button"
                      onClick={() => setShowMoviesSearch(!showMoviesSearch)}
                      className="btn-primary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      {showMoviesSearch ? 'Close Search' : 'Search Movies & TV Shows 🍿'}
                    </button>
                  </div>

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
                            <button
                              type="button"
                              onClick={() => {
                                updateCardMovies([...cardMovies, m]);
                                showToast(`Added "${m.title}" to this card!`, 'success');
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

                  {cardMovies.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 135px)', gap: '0.75rem' }}>
                      {cardMovies.map((m: any, mIdx: number) => (
                        <div key={m.id || mIdx} style={{ background: 'rgba(0,0,0,0.25)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '2px', zIndex: 2 }}>
                            <button
                              type="button"
                              disabled={mIdx === 0}
                              onClick={() => {
                                const updated = [...cardMovies];
                                const temp = updated[mIdx];
                                updated[mIdx] = updated[mIdx - 1];
                                updated[mIdx - 1] = temp;
                                updateCardMovies(updated);
                              }}
                              style={{ background: 'rgba(0,0,0,0.7)', color: mIdx === 0 ? 'rgba(255,255,255,0.3)' : '#fff', border: 'none', borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', cursor: mIdx === 0 ? 'default' : 'pointer' }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={mIdx === cardMovies.length - 1}
                              onClick={() => {
                                const updated = [...cardMovies];
                                const temp = updated[mIdx];
                                updated[mIdx] = updated[mIdx + 1];
                                updated[mIdx + 1] = temp;
                                updateCardMovies(updated);
                              }}
                              style={{ background: 'rgba(0,0,0,0.7)', color: mIdx === cardMovies.length - 1 ? 'rgba(255,255,255,0.3)' : '#fff', border: 'none', borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', cursor: mIdx === cardMovies.length - 1 ? 'default' : 'pointer' }}
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateCardMovies(cardMovies.filter((_: any, i: number) => i !== mIdx));
                              }}
                              style={{ background: 'rgba(239, 68, 68, 0.85)', color: '#fff', border: 'none', borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          </div>
                          <img src={m.posterUrl} alt="" style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.3rem' }} />
                          <div style={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                          <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={!!m.inProgress}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  updateCardMovies(cardMovies.map((item: any, i: number) => i === mIdx ? { ...item, inProgress: checked, onMyList: checked ? false : item.onMyList } : item));
                                }}
                              />
                              <span>In Progress 🍿</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={!!m.onMyList}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  updateCardMovies(cardMovies.map((item: any, i: number) => i === mIdx ? { ...item, onMyList: checked, inProgress: checked ? false : item.inProgress } : item));
                                }}
                              />
                              <span>On My List 📌</span>
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Rating:</span>
                              <input
                                type="text"
                                placeholder="5.0"
                                value={m.rating !== undefined && m.rating !== null ? m.rating : ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  updateCardMovies(cardMovies.map((item: any, i: number) => i === mIdx ? { ...item, rating: val } : item));
                                }}
                                style={{ width: '45px', padding: '0.1rem 0.3rem', fontSize: '0.72rem', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#facc15', fontWeight: 700 }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ opacity: 0.6, fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>No movies or TV shows added to this card yet. Search above! 🎬</p>
                  )}
                </div>
              );
            }

            if (c.type === 'books') {
              const cardBooks = c.favorite_books || (cIdx === cardLayout.findIndex(item => item.type === 'books') ? favoriteBooks : []);
              return (
                <div key={c.id} className="nook-panel">
                  <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span>📖 Reading Nook ({cardNumLabel} - {cardBooks.length} books)</span>
                    <button
                      type="button"
                      onClick={() => setShowBooksSearch(!showBooksSearch)}
                      className="btn-primary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      {showBooksSearch ? 'Close Search' : 'Search Books 📚'}
                    </button>
                  </div>

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
                            <button
                              type="button"
                              onClick={() => {
                                updateCardBooks([...cardBooks, b]);
                                showToast(`Added "${b.title}" to this card!`, 'success');
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

                  {cardBooks.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 135px)', gap: '0.75rem' }}>
                      {cardBooks.map((b: any, bIdx: number) => (
                        <div key={b.id || bIdx} style={{ background: 'rgba(0,0,0,0.25)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '2px', zIndex: 2 }}>
                            <button
                              type="button"
                              disabled={bIdx === 0}
                              onClick={() => {
                                const updated = [...cardBooks];
                                const temp = updated[bIdx];
                                updated[bIdx] = updated[bIdx - 1];
                                updated[bIdx - 1] = temp;
                                updateCardBooks(updated);
                              }}
                              style={{ background: 'rgba(0,0,0,0.7)', color: bIdx === 0 ? 'rgba(255,255,255,0.3)' : '#fff', border: 'none', borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', cursor: bIdx === 0 ? 'default' : 'pointer' }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={bIdx === cardBooks.length - 1}
                              onClick={() => {
                                const updated = [...cardBooks];
                                const temp = updated[bIdx];
                                updated[bIdx] = updated[bIdx + 1];
                                updated[bIdx + 1] = temp;
                                updateCardBooks(updated);
                              }}
                              style={{ background: 'rgba(0,0,0,0.7)', color: bIdx === cardBooks.length - 1 ? 'rgba(255,255,255,0.3)' : '#fff', border: 'none', borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', cursor: bIdx === cardBooks.length - 1 ? 'default' : 'pointer' }}
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateCardBooks(cardBooks.filter((_: any, i: number) => i !== bIdx));
                              }}
                              style={{ background: 'rgba(239, 68, 68, 0.85)', color: '#fff', border: 'none', borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          </div>
                          <img src={b.coverUrl} alt="" style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.3rem' }} />
                          <div style={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
                          <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={!!b.inProgress}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  updateCardBooks(cardBooks.map((item: any, i: number) => i === bIdx ? { ...item, inProgress: checked, onMyList: checked ? false : item.onMyList } : item));
                                }}
                              />
                              <span>In Progress 📖</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={!!b.onMyList}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  updateCardBooks(cardBooks.map((item: any, i: number) => i === bIdx ? { ...item, onMyList: checked, inProgress: checked ? false : item.inProgress } : item));
                                }}
                              />
                              <span>On My List 📌</span>
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Rating:</span>
                              <input
                                type="text"
                                placeholder="5.0"
                                value={b.rating !== undefined && b.rating !== null ? b.rating : ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  updateCardBooks(cardBooks.map((item: any, i: number) => i === bIdx ? { ...item, rating: val } : item));
                                }}
                                style={{ width: '45px', padding: '0.1rem 0.3rem', fontSize: '0.72rem', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#facc15', fontWeight: 700 }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ opacity: 0.6, fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>No books added to this card yet. Search or import CSV above! 📖</p>
                  )}
                </div>
              );
            }

            if (c.type === 'hobbies') {
              const cardHobbies = c.hobbies || (cIdx === cardLayout.findIndex(item => item.type === 'hobbies') ? hobbies : []);
              return (
                <div key={c.id} className="nook-panel">
                  <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🎯 Hobbies & Passions ({cardNumLabel} - {cardHobbies.length} items)</span>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                      onClick={() => {
                        const newHobby: HobbyItem = {
                          id: `h_${Date.now()}`,
                          name: 'New Hobby',
                          icon: '✨',
                          category: 'Interest',
                          description: 'Description of your passion'
                        };
                        updateCardHobbies([...cardHobbies, newHobby]);
                      }}
                    >
                      + Add Custom Hobby
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '0.85rem', marginTop: '1rem' }}>
                    {cardHobbies.map((h: any, hIdx: number) => (
                      <div key={h.id || hIdx} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {/* Up / Down Reorder buttons for Hobby */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0 }}>
                            <button
                              type="button"
                              disabled={hIdx === 0}
                              onClick={() => {
                                const updated = [...cardHobbies];
                                const temp = updated[hIdx];
                                updated[hIdx] = updated[hIdx - 1];
                                updated[hIdx - 1] = temp;
                                updateCardHobbies(updated);
                              }}
                              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: hIdx === 0 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: hIdx === 0 ? 'default' : 'pointer', padding: '1px 4px', borderRadius: '3px', fontSize: '0.65rem' }}
                              title="Move Hobby Up"
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              type="button"
                              disabled={hIdx === cardHobbies.length - 1}
                              onClick={() => {
                                const updated = [...cardHobbies];
                                const temp = updated[hIdx];
                                updated[hIdx] = updated[hIdx + 1];
                                updated[hIdx + 1] = temp;
                                updateCardHobbies(updated);
                              }}
                              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: hIdx === cardHobbies.length - 1 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: hIdx === cardHobbies.length - 1 ? 'default' : 'pointer', padding: '1px 4px', borderRadius: '3px', fontSize: '0.65rem' }}
                              title="Move Hobby Down"
                            >
                              <ArrowDown size={11} />
                            </button>
                          </div>

                          <input
                            type="text"
                            placeholder="Emoji"
                            value={h.icon || ''}
                            onChange={e => {
                              const val = e.target.value;
                              updateCardHobbies(cardHobbies.map((item: any, i: number) => i === hIdx ? { ...item, icon: val } : item));
                            }}
                            style={{ width: '42px', padding: '0.4rem 0.2rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.9rem', textAlign: 'center', flexShrink: 0 }}
                          />
                          <input
                            type="text"
                            placeholder="Hobby Name"
                            value={h.name}
                            onChange={e => {
                              const val = e.target.value;
                              updateCardHobbies(cardHobbies.map((item: any, i: number) => i === hIdx ? { ...item, name: val } : item));
                            }}
                            style={{ flex: 1, minWidth: 0, padding: '0.4rem 0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateCardHobbies(cardHobbies.filter((_: any, i: number) => i !== hIdx));
                            }}
                            style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', padding: '0.35rem 0.55rem', fontSize: '0.85rem', flexShrink: 0 }}
                          >
                            ✕
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Category"
                          value={h.category || ''}
                          onChange={e => {
                            const val = e.target.value;
                            updateCardHobbies(cardHobbies.map((item: any, i: number) => i === hIdx ? { ...item, category: val } : item));
                          }}
                          style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.78rem' }}
                        />
                        <input
                          type="text"
                          placeholder="Description"
                          value={h.description || ''}
                          onChange={e => {
                            const val = e.target.value;
                            updateCardHobbies(cardHobbies.map((item: any, i: number) => i === hIdx ? { ...item, description: val } : item));
                          }}
                          style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.78rem' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (c.type === 'markdown' || c.type === 'html') {
              return (
                <div key={c.id} className="nook-panel">
                  <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {c.type === 'markdown' ? <FileText size={18} color="#38bdf8" /> : <Code size={18} color="#c084fc" />}
                      <span>{cardNumLabel}</span>
                    </span>
                  </div>

                  {c.type === 'markdown' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.8 }}>Markdown Text Content:</label>
                        <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}>
                          <Upload size={14} />
                          <span>Attach Photo...</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f || !token) return;
                              const formData = new FormData();
                              formData.append('sticker', f);
                              try {
                                const res = await fetch('/api/nook/upload/sticker', {
                                  method: 'POST',
                                  headers: { Authorization: `Bearer ${token}` },
                                  body: formData
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  const imageMarkdown = `\n\n![${f.name}](${data.sticker_url})\n`;
                                  const updated = [...cardLayout];
                                  updated[cIdx].content_markdown = (updated[cIdx].content_markdown || '') + imageMarkdown;
                                  setCardLayout(updated);
                                  showToast('Photo inserted into Markdown card!', 'success');
                                }
                              } catch (err) {}
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.85 }}>Card Header Icon / Emoji:</label>
                        <input
                          type="text"
                          placeholder="e.g. 📄, ✨, 🚀, 💻"
                          value={c.icon || ''}
                          onChange={e => {
                            const updated = [...cardLayout];
                            updated[cIdx].icon = e.target.value;
                            setCardLayout(updated);
                          }}
                          style={{ width: '100px', padding: '0.35rem 0.55rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                        />
                      </div>
                      <textarea
                        rows={5}
                        value={c.content_markdown || ''}
                        onChange={e => {
                          const updated = [...cardLayout];
                          updated[cIdx].content_markdown = e.target.value;
                          setCardLayout(updated);
                        }}
                        placeholder="Write markdown content..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem', fontFamily: 'monospace' }}
                      />
                      <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '0.85rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6, marginBottom: '0.4rem', textTransform: 'uppercase' }}>✨ Live Card Preview:</div>
                        <MarkdownRenderer content={c.content_markdown || ''} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.85 }}>Card Header Icon / Emoji:</label>
                        <input
                          type="text"
                          placeholder="e.g. ⚡, 🎨, 🛠️, 💻"
                          value={c.icon || ''}
                          onChange={e => {
                            const updated = [...cardLayout];
                            updated[cIdx].icon = e.target.value;
                            setCardLayout(updated);
                          }}
                          style={{ width: '100px', padding: '0.35rem 0.55rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                        />
                      </div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.8 }}>Raw HTML Code Content:</label>
                      <textarea
                        rows={5}
                        value={c.content_html || ''}
                        onChange={e => {
                          const updated = [...cardLayout];
                          updated[cIdx].content_html = e.target.value;
                          setCardLayout(updated);
                        }}
                        placeholder="Input custom HTML markup..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem', fontFamily: 'monospace' }}
                      />
                      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '0.85rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6, marginBottom: '0.5rem' }}>HTML CARD PREVIEW:</div>
                        <div dangerouslySetInnerHTML={{ __html: c.content_html || '' }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}

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
