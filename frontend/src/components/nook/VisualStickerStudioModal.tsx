import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StickerCanvas, Sticker, convertStickerAnchor } from './StickerCanvas';
import { PRESET_STICKERS } from '../../constants/presetStickers';
import {
  X, Save, Layers, RotateCw, Maximize2, Trash2, Plus, Sparkles, Ghost,
  Pin, Globe, Undo2, Redo2, Monitor, Tablet, Smartphone, Upload, ArrowUp, ArrowDown, Heart, FileText, Code
} from 'lucide-react';
import { MusicWidget } from '../widgets/MusicWidget';
import { SteamWidget } from '../widgets/SteamWidget';
import { MoviesWidget } from '../widgets/MoviesWidget';
import { BooksWidget } from '../widgets/BooksWidget';
import { HobbiesWidget } from '../widgets/HobbiesWidget';
import { TopFriendsGrid } from './TopFriendsGrid';
import { GuestbookWidget } from './GuestbookWidget';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { buildNookRootProps, NookStyleOverrides } from '../../utils/nookStyle';
import { sanitizeHtml } from '../../utils/sanitize';

interface CardConfigItem {
  id: string;
  type: string;
  title?: string;
  icon?: string;
  enabled?: boolean;
  content_markdown?: string;
  content_html?: string;
  favorite_movies?: any[];
  favorite_books?: any[];
  music_tracks?: any[];
  hobbies?: any[];
  steam_id64?: string;
  steam_display_mode?: 'none' | 'recently_played' | 'top_games' | 'both';
  steam_excluded_games?: string[];
}

interface VisualStickerStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  stickers: Sticker[];
  onSaveStickers: (stickers: Sticker[]) => void;
  theme: string;
  bgColor: string;
  cardBgColor: string;
  accentColor: string;
  textColor: string;
  borderColor: string;
  styleOverrides?: NookStyleOverrides;
  cardLayout?: CardConfigItem[];
  hobbies?: any[];
  token?: string | null;
  user?: any;
  nookSettings?: any;
  favoriteMovies?: any[];
  favoriteBooks?: any[];
  topFriends?: any[];
}

const DEFAULT_STUDIO_LAYOUT: CardConfigItem[] = [
  { id: 'c_bio', type: 'bio', title: 'About Me', enabled: true },
  { id: 'c_music', type: 'music', title: 'My Music Playlist', enabled: true },
  { id: 'c_friends', type: 'friends', title: 'Top Friends', enabled: true },
  { id: 'c_hobbies', type: 'hobbies', title: 'Hobbies & Passions', enabled: true },
  { id: 'c_movies', type: 'movies', title: 'Movies & TV Favorites', enabled: true },
  { id: 'c_books', type: 'books', title: 'Reading Nook & Books', enabled: true },
  { id: 'c_steam', type: 'steam', title: 'Steam Showcase', enabled: true }
];

export const VisualStickerStudioModal: React.FC<VisualStickerStudioModalProps> = ({
  isOpen,
  onClose,
  stickers: initialStickers,
  onSaveStickers,
  theme,
  bgColor,
  cardBgColor,
  accentColor,
  textColor,
  borderColor,
  styleOverrides,
  cardLayout,
  hobbies,
  token,
  user,
  nookSettings,
  favoriteMovies,
  favoriteBooks,
  topFriends
}) => {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [past, setPast] = useState<Sticker[][]>([]);
  const [future, setFuture] = useState<Sticker[][]>([]);
  const [ghostCards, setGhostCards] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isUploadingSticker, setIsUploadingSticker] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const studioContainerRef = useRef<HTMLDivElement>(null);
  const stickersRef = useRef(stickers);
  stickersRef.current = stickers;

  // Sync local studio copy whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const cloned = (initialStickers || []).map((s) => ({
        ...s,
        anchor_type: s.anchor_type || 'container',
        anchor_id: s.anchor_id || ''
      }));
      setStickers(cloned);
      setSelectedIndex(cloned.length > 0 ? 0 : null);
      setPast([]);
      setFuture([]);
      setShowPresetPicker(false);
      setUploadError(null);
    }
  }, [isOpen, initialStickers]);

  const pushHistorySnapshot = useCallback((snapshot?: Sticker[]) => {
    const snap = (snapshot || stickersRef.current).map((s) => ({ ...s }));
    setPast((prev) => [...prev.slice(-39), snap]);
    setFuture([]);
  }, []);

  const handleUndo = useCallback(() => {
    setPast((prev) => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setFuture((f) => [stickersRef.current.map((s) => ({ ...s })), ...f.slice(0, 39)]);
      setStickers(previous);
      setSelectedIndex((sel) => (previous.length === 0 ? null : Math.min(sel ?? 0, previous.length - 1)));
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[0];
      setPast((p) => [...p.slice(-39), stickersRef.current.map((s) => ({ ...s }))]);
      setStickers(next);
      setSelectedIndex((sel) => (next.length === 0 ? null : Math.min(sel ?? 0, next.length - 1)));
      return prev.slice(1);
    });
  }, []);

  const handleDeleteIndex = useCallback(
    (idx: number) => {
      pushHistorySnapshot();
      const updated = stickersRef.current.filter((_, i) => i !== idx);
      setStickers(updated);
      setSelectedIndex(updated.length > 0 ? Math.min(idx, updated.length - 1) : null);
    },
    [pushHistorySnapshot]
  );

  // Keyboard shortcuts (Ctrl+Z/Y, Arrow nudging, Delete)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'select' || activeTag === 'textarea') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (selectedIndex === null || !stickersRef.current[selectedIndex]) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteIndex(selectedIndex);
        return;
      }

      const step = e.shiftKey ? 2.5 : 0.5;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        pushHistorySnapshot();
        const cur = stickersRef.current[selectedIndex];
        let nx = cur.pos_x;
        let ny = cur.pos_y;
        if (e.key === 'ArrowLeft') nx = Math.max(0, Math.round((nx - step) * 10) / 10);
        if (e.key === 'ArrowRight') nx = Math.min(100, Math.round((nx + step) * 10) / 10);
        if (e.key === 'ArrowUp') ny = Math.max(0, Math.round((ny - step) * 10) / 10);
        if (e.key === 'ArrowDown') ny = Math.min(100, Math.round((ny + step) * 10) / 10);
        setStickers((prev) => prev.map((s, i) => (i === selectedIndex ? { ...s, pos_x: nx, pos_y: ny } : s)));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, selectedIndex, handleUndo, handleRedo, handleDeleteIndex, pushHistorySnapshot]);

  if (!isOpen) return null;

  const selectedSticker =
    selectedIndex !== null && stickers[selectedIndex] ? stickers[selectedIndex] : null;

  let cardVisibility: Record<string, boolean> = {
    bio: true,
    music: true,
    friends: true,
    steam: true,
    guestbook: true,
    movies: true,
    books: true
  };
  if (nookSettings?.card_visibility_json) {
    try {
      const parsed =
        typeof nookSettings.card_visibility_json === 'string'
          ? JSON.parse(nookSettings.card_visibility_json)
          : nookSettings.card_visibility_json;
      cardVisibility = { ...cardVisibility, ...parsed };
    } catch {}
  }

  let cardTitles: Record<string, string> = {};
  if (nookSettings?.card_titles_json) {
    try {
      cardTitles =
        typeof nookSettings.card_titles_json === 'string'
          ? JSON.parse(nookSettings.card_titles_json)
          : nookSettings.card_titles_json;
    } catch {}
  }

  const effectiveLayout = (cardLayout && cardLayout.length > 0 ? cardLayout : DEFAULT_STUDIO_LAYOUT).filter(
    (c) => c.enabled !== false && c.type !== 'guestbook'
  );

  // Build available card anchor targets matching mounted cards
  const anchorOptions: { id: string; label: string }[] = [
    { id: 'header', label: 'Profile Header Banner' },
    ...effectiveLayout.map((c) => ({
      id: c.id,
      label: c.title?.trim() || cardTitles[c.type] || `Card: ${c.type}`
    })),
    ...(cardVisibility.guestbook !== false ? [{ id: 'guestbook', label: 'Guestbook Notes' }] : [])
  ];

  const handleAddStickerUrl = (url: string) => {
    pushHistorySnapshot();
    const defaultAnchorId = anchorOptions[0]?.id || 'header';
    const newSticker: Sticker = {
      sticker_url: url,
      pos_x: 50,
      pos_y: 50,
      scale: 1,
      rotation: 0,
      z_index: stickers.length + 1,
      layer: 'above_cards',
      anchor_type: 'card',
      anchor_id: defaultAnchorId
    };
    const updated = [...stickers, newSticker];
    setStickers(updated);
    setSelectedIndex(updated.length - 1);
    setShowPresetPicker(false);
  };

  const handleUploadCustomSticker = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !token) return;
    setUploadError(null);
    setIsUploadingSticker(true);
    const formData = new FormData();
    formData.append('sticker', file);
    try {
      const res = await fetch('/api/nook/upload/sticker', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.sticker_url) {
        handleAddStickerUrl(data.sticker_url);
      } else {
        setUploadError(data.error || 'Failed to upload custom sticker.');
      }
    } catch {
      setUploadError('Network error while uploading custom sticker.');
    } finally {
      setIsUploadingSticker(false);
    }
  };

  const handleUpdateSelected = (changes: Partial<Sticker>) => {
    if (selectedIndex === null) return;
    pushHistorySnapshot();
    setStickers((prev) =>
      prev.map((st, i) => (i === selectedIndex ? { ...st, ...changes } : st))
    );
  };

  const handleAnchorChange = (nextType: 'container' | 'card', nextAnchorId: string) => {
    if (selectedIndex === null || !selectedSticker) return;
    pushHistorySnapshot();
    const converted = convertStickerAnchor(
      selectedSticker,
      nextType,
      nextAnchorId,
      studioContainerRef.current
    );
    setStickers((prev) => prev.map((st, i) => (i === selectedIndex ? converted : st)));
  };

  const handleAdjustZOrder = (dir: 'up' | 'down') => {
    if (selectedIndex === null || !selectedSticker) return;
    pushHistorySnapshot();
    const currentZ = selectedSticker.z_index || 10;
    const nextZ = Math.max(1, dir === 'up' ? currentZ + 2 : currentZ - 2);
    setStickers((prev) => prev.map((st, i) => (i === selectedIndex ? { ...st, z_index: nextZ } : st)));
  };

  const handleSaveAndClose = () => {
    onSaveStickers(stickers);
    onClose();
  };

  const rootProps = buildNookRootProps({
    theme,
    bgColor: bgColor || '#0e0f17',
    textColor: textColor || '#ffffff',
    accentColor: accentColor || '#6366f1',
    overrides: {
      ...styleOverrides,
      cardBg: cardBgColor || styleOverrides?.cardBg,
      border: borderColor || styleOverrides?.border
    }
  });

  const previewWidth =
    viewportMode === 'mobile' ? '390px' : viewportMode === 'tablet' ? '768px' : '1200px';
  const isNarrowPreview = viewportMode !== 'desktop';

  const renderPreviewCard = (c: CardConfigItem) => {
    switch (c.type) {
      case 'bio':
        return (
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Heart size={18} />
              <span>{c.title || cardTitles.bio || 'About Me'}</span>
            </div>
            <p style={{ fontSize: '0.86rem', opacity: 0.85, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {user?.bio || 'Passionate web builder, gamer, music lover, and cozy space creator.'}
            </p>
          </div>
        );
      case 'music':
        return (
          <MusicWidget
            title={c.title || cardTitles.music || 'My Music Playlist'}
            tracks={
              c.music_tracks && c.music_tracks.length > 0
                ? c.music_tracks
                : nookSettings?.music_tracks_json
                ? typeof nookSettings.music_tracks_json === 'string'
                  ? JSON.parse(nookSettings.music_tracks_json)
                  : nookSettings.music_tracks_json
                : []
            }
            bgMusicUrl={nookSettings?.bg_music_url}
            bgMusicTitle={nookSettings?.bg_music_title}
            spotifyTrackUrl={nookSettings?.spotify_track_url}
            appleMusicUrl={nookSettings?.apple_music_url}
          />
        );
      case 'movies':
        return (
          <MoviesWidget
            title={c.title || cardTitles.movies || 'Movies & TV Favorites'}
            movies={
              c.favorite_movies && c.favorite_movies.length > 0
                ? c.favorite_movies
                : favoriteMovies && favoriteMovies.length > 0
                ? favoriteMovies
                : []
            }
          />
        );
      case 'books':
        return (
          <BooksWidget
            title={c.title || cardTitles.books || 'Books & Reading Nook'}
            books={
              c.favorite_books && c.favorite_books.length > 0
                ? c.favorite_books
                : favoriteBooks && favoriteBooks.length > 0
                ? favoriteBooks
                : []
            }
            storygraphUsername={nookSettings?.storygraph_username}
          />
        );
      case 'hobbies':
        return (
          <HobbiesWidget
            title={c.title || cardTitles.hobbies || 'Hobbies & Passions'}
            hobbies={c.hobbies && c.hobbies.length > 0 ? c.hobbies : hobbies || []}
            isOwner={false}
          />
        );
      case 'friends':
        return (
          <TopFriendsGrid
            title={c.title || cardTitles.friends || 'Top Friends'}
            topFriends={topFriends || []}
            ownerUsername={user?.username || 'User'}
          />
        );
      case 'steam':
        return (
          <SteamWidget
            title={c.title || cardTitles.steam || 'Steam Showcase'}
            steamId64={c.steam_id64 || nookSettings?.steam_id64 || ''}
            displayMode={c.steam_display_mode || nookSettings?.steam_display_mode || 'both'}
            excludedGames={c.steam_excluded_games || []}
          />
        );
      case 'markdown':
        return (
          <div className="nook-panel">
            {c.title && (
              <div className="nook-panel-header">
                {c.icon ? <span>{c.icon}</span> : <FileText size={18} />}
                <span>{c.title}</span>
              </div>
            )}
            <MarkdownRenderer content={c.content_markdown || ''} />
          </div>
        );
      case 'html':
        return (
          <div className="nook-panel">
            {c.title && (
              <div className="nook-panel-header">
                {c.icon ? <span>{c.icon}</span> : <Code size={18} />}
                <span>{c.title}</span>
              </div>
            )}
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.content_html || '') }} />
          </div>
        );
      default:
        return null;
    }
  };

  const leftCards = effectiveLayout.filter((_, idx) => idx % 2 === 0);
  const rightCards = effectiveLayout.filter((_, idx) => idx % 2 !== 0);

  return (
    <div
      className={rootProps.className}
      style={{
        ...rootProps.style,
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflowY: 'auto'
      }}
    >
      {/* Floating Studio Control Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          background: '#0f111e',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '0.75rem 1.25rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          color: '#ffffff'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem 1rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} style={{ color: 'var(--accent-color, #6366f1)', flexShrink: 0 }} />
              <h2 style={{ fontSize: '1.12rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Visual Sticker Studio
              </h2>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '0.2rem 0 0', lineHeight: 1.3 }}>
              Pin stickers to cards so they lock reliably across desktop &amp; mobile screens!
            </p>
          </div>

          {/* Viewport Switcher + History + Ghost + Save */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255,255,255,0.16)' }}>
              {([
                { id: 'desktop', icon: Monitor, title: 'Desktop Width (1200px)' },
                { id: 'tablet', icon: Tablet, title: 'Tablet Width (768px)' },
                { id: 'mobile', icon: Smartphone, title: 'Mobile Width (390px)' }
              ] as const).map(({ id, icon: Icon, title }) => (
                <button
                  key={id}
                  type="button"
                  title={title}
                  onClick={() => setViewportMode(id)}
                  style={{
                    padding: '0.35rem 0.55rem',
                    borderRadius: '6px',
                    background: viewportMode === id ? '#6366f1' : 'transparent',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.76rem',
                    fontWeight: 700
                  }}
                >
                  <Icon size={14} />
                  <span style={{ textTransform: 'capitalize' }}>{id}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleUndo}
              disabled={past.length === 0}
              title="Undo (Ctrl+Z)"
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                opacity: past.length === 0 ? 0.4 : 1,
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.78rem'
              }}
            >
              <Undo2 size={14} />
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={future.length === 0}
              title="Redo (Ctrl+Y)"
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                opacity: future.length === 0 ? 0.4 : 1,
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.78rem'
              }}
            >
              <Redo2 size={14} />
              <span>Redo</span>
            </button>

            <button
              type="button"
              onClick={() => setGhostCards(!ghostCards)}
              style={{
                padding: '0.42rem 0.85rem',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                borderRadius: '8px',
                background: ghostCards ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                border: ghostCards ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.25)',
                fontWeight: 600
              }}
              title="Ghost Cards makes cards translucent & click-through so you can grab stickers behind cards"
            >
              <Ghost size={15} />
              <span>{ghostCards ? 'Ghost ON' : 'Ghost OFF'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndClose}
              className="btn-primary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.84rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Save size={15} />
              <span>Save &amp; Return</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '0.35rem', color: '#fff', display: 'inline-flex', alignItems: 'center' }}
              title="Close Sticker Studio"
            >
              <X size={19} />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Toolbar: Add Sticker & Anchor/Transform Controls */}
      <div
        style={{
          position: 'sticky',
          top: '62px',
          zIndex: 999,
          background: '#161827',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '0.6rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.85rem',
          flexWrap: 'wrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          color: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setShowPresetPicker(!showPresetPicker)}
            className="btn-primary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
          >
            <Plus size={15} />
            <span>Add Sticker</span>
          </button>

          {token && (
            <label
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: '8px',
                cursor: isUploadingSticker ? 'wait' : 'pointer',
                fontWeight: 600
              }}
            >
              <Upload size={14} />
              <span>{isUploadingSticker ? 'Uploading...' : 'Upload Image'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={isUploadingSticker}
                onChange={handleUploadCustomSticker}
                style={{ display: 'none' }}
              />
            </label>
          )}
          {uploadError && <span style={{ color: '#f87171', fontSize: '0.78rem' }}>{uploadError}</span>}
        </div>

        {selectedSticker ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
            {/* Anchor Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.06)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.14)' }}>
              <button
                type="button"
                onClick={() =>
                  handleAnchorChange('card', selectedSticker.anchor_id || anchorOptions[0]?.id || 'header')
                }
                style={{
                  padding: '0.22rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: selectedSticker.anchor_type === 'card' ? '#6366f1' : 'transparent',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
                title="Pin sticker coordinates directly to a specific card"
              >
                <Pin size={12} />
                <span>Pin to Card</span>
              </button>
              <button
                type="button"
                onClick={() => handleAnchorChange('container', '')}
                style={{
                  padding: '0.22rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: selectedSticker.anchor_type !== 'card' ? '#6366f1' : 'transparent',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
                title="Position relative to the outer Nook container"
              >
                <Globe size={12} />
                <span>Free Canvas</span>
              </button>

              {selectedSticker.anchor_type === 'card' && (
                <select
                  value={selectedSticker.anchor_id || anchorOptions[0]?.id || 'header'}
                  onChange={(e) => handleAnchorChange('card', e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.22)',
                    borderRadius: '6px',
                    padding: '0.2rem 0.45rem',
                    fontSize: '0.75rem',
                    maxWidth: '170px'
                  }}
                >
                  {anchorOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Layer Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Layers size={15} color="#818cf8" />
              <select
                value={selectedSticker.layer || 'above_cards'}
                onChange={(e) => handleUpdateSelected({ layer: e.target.value as any })}
                style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}
              >
                <option value="above_cards">Above Cards</option>
                <option value="behind_cards">Behind Cards</option>
              </select>
            </div>

            {/* Scale Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Maximize2 size={14} color="#818cf8" />
              <input
                type="range"
                min="0.2"
                max="3.5"
                step="0.1"
                value={selectedSticker.scale || 1.0}
                onChange={(e) => handleUpdateSelected({ scale: parseFloat(e.target.value) })}
                style={{ width: '80px' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#e2e8f0', width: '32px', fontWeight: 600 }}>
                {(selectedSticker.scale || 1.0).toFixed(1)}x
              </span>
            </div>

            {/* Rotation Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <RotateCw size={14} color="#818cf8" />
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={selectedSticker.rotation || 0}
                onChange={(e) => handleUpdateSelected({ rotation: parseInt(e.target.value, 10) })}
                style={{ width: '80px' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#e2e8f0', width: '34px', fontWeight: 600 }}>
                {selectedSticker.rotation || 0}°
              </span>
            </div>

            {/* Z-Order */}
            <div style={{ display: 'inline-flex', gap: '0.2rem' }}>
              <button
                type="button"
                title="Bring Forward"
                onClick={() => handleAdjustZOrder('up')}
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '0.25rem 0.4rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                title="Send Backward"
                onClick={() => handleAdjustZOrder('down')}
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '0.25rem 0.4rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <ArrowDown size={13} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => selectedIndex !== null && handleDeleteIndex(selectedIndex)}
              style={{ background: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: '6px', padding: '0.26rem 0.65rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            Click a sticker to drag, resize, rotate, or pin it to a specific card.
          </span>
        )}
      </div>

      {/* Preset Sticker Grid Drawer */}
      {showPresetPicker && (
        <div
          style={{
            position: 'fixed',
            top: '120px',
            left: '1.25rem',
            zIndex: 10000,
            background: 'rgba(18, 20, 32, 0.98)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            padding: '1rem',
            maxWidth: '420px',
            maxHeight: '60vh',
            overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            color: '#fff'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Click a Sticker to Add</h4>
            <button type="button" onClick={() => setShowPresetPicker(false)} style={{ background: 'none', color: '#aaa' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {PRESET_STICKERS.map((st) => {
              const isEmoji = !st.url.startsWith('/') && !st.url.startsWith('http');
              return (
                <button
                  type="button"
                  key={st.id}
                  onClick={() => handleAddStickerUrl(st.url)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: '#fff'
                  }}
                >
                  {isEmoji ? (
                    <span style={{ fontSize: '1.8rem' }}>{st.url}</span>
                  ) : (
                    <img src={st.url} alt={st.name} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  )}
                  <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>{st.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Preview Canvas Container matching NookViewPage geometry */}
      <div style={{ padding: '1.5rem 1rem 4rem' }}>
        <div
          ref={studioContainerRef}
          className="nook-container"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedIndex(null);
          }}
          style={{
            maxWidth: previewWidth,
            width: '100%',
            margin: '0 auto',
            position: 'relative',
            zIndex: 10,
            isolation: 'isolate',
            borderRadius: viewportMode !== 'desktop' ? '16px' : undefined,
            outline: viewportMode !== 'desktop' ? '2px dashed rgba(255,255,255,0.22)' : undefined,
            transition: 'max-width 0.25s ease'
          }}
        >
          {/* Layer 1: Behind Cards Stickers */}
          <StickerCanvas
            stickers={stickers}
            targetLayer="behind_cards"
            isEditing={true}
            selectedIdx={selectedIndex}
            containerRef={studioContainerRef}
            highlightAnchorId={selectedSticker?.anchor_type === 'card' ? selectedSticker.anchor_id : null}
            onStickerUpdate={setStickers}
            onStickerSelect={(idx) => setSelectedIndex(idx)}
            onStickerDelete={handleDeleteIndex}
            onDragStartSnapshot={() => pushHistorySnapshot()}
          />

          {/* Interactive Preview Cards Wrapper */}
          <div
            style={{
              position: 'relative',
              zIndex: 15,
              opacity: ghostCards ? 0.25 : 1,
              pointerEvents: ghostCards ? 'none' : 'auto',
              transition: 'opacity 0.2s ease'
            }}
          >
            {/* Header Card */}
            <div data-sticker-anchor="header" className="nook-panel nook-header-panel">
              {user?.banner_url ? (
                <div className="nook-header-banner">
                  <img
                    className="nook-banner-image"
                    src={user.banner_url}
                    alt="Nook Banner"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div
                  className="nook-header-banner"
                  style={{ background: 'linear-gradient(135deg, var(--accent-color) 0%, #a855f7 100%)' }}
                />
              )}

              <div className="nook-header-body">
                <div className="nook-avatar-name-group">
                  <img
                    src={user?.avatar_url || '/branding/default_avatar.svg'}
                    alt=""
                    className="nook-header-avatar"
                  />
                  <div className="nook-header-user-info">
                    <h1 className="nook-header-title" style={{ color: 'var(--accent-color)' }}>
                      {user?.display_name || user?.username || 'My WebNook Space'}
                    </h1>
                    <p className="nook-header-handle">@{user?.username || 'user'}</p>
                    {user?.status_message && (
                      <p className="nook-header-status">"{user.status_message}"</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Real User Card Layout Grid */}
            <div
              className="nook-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: isNarrowPreview ? '1fr' : '1fr 1fr',
                gap: '1.5rem'
              }}
            >
              {isNarrowPreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', gridColumn: '1 / -1' }}>
                  {effectiveLayout.map((c) => {
                    const cardEl = renderPreviewCard(c);
                    if (!cardEl) return null;
                    return (
                      <div key={c.id} data-sticker-anchor={c.id} style={{ position: 'relative' }}>
                        {cardEl}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {leftCards.map((c) => {
                      const cardEl = renderPreviewCard(c);
                      if (!cardEl) return null;
                      return (
                        <div key={c.id} data-sticker-anchor={c.id} style={{ position: 'relative' }}>
                          {cardEl}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {rightCards.map((c) => {
                      const cardEl = renderPreviewCard(c);
                      if (!cardEl) return null;
                      return (
                        <div key={c.id} data-sticker-anchor={c.id} style={{ position: 'relative' }}>
                          {cardEl}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Full Width Bottom Guestbook Card */}
              {cardVisibility.guestbook !== false && (
                <div data-sticker-anchor="guestbook" className="nook-full-col" style={{ gridColumn: '1 / -1', marginTop: '0.5rem', position: 'relative' }}>
                  <GuestbookWidget
                    title={cardTitles.guestbook || 'Guestbook & Comments'}
                    nookUsername={user?.username || 'user'}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Layer 2: Above Cards Stickers */}
          <StickerCanvas
            stickers={stickers}
            targetLayer="above_cards"
            isEditing={true}
            selectedIdx={selectedIndex}
            containerRef={studioContainerRef}
            highlightAnchorId={selectedSticker?.anchor_type === 'card' ? selectedSticker.anchor_id : null}
            onStickerUpdate={setStickers}
            onStickerSelect={(idx) => setSelectedIndex(idx)}
            onStickerDelete={handleDeleteIndex}
            onDragStartSnapshot={() => pushHistorySnapshot()}
          />
        </div>
      </div>
    </div>
  );
};
