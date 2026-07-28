import React, { useState } from 'react';
import { StickerCanvas, Sticker } from './StickerCanvas';
import { PRESET_STICKERS } from '../../constants/presetStickers';
import { X, Save, Layers, RotateCw, Maximize2, Trash2, Plus, Sparkles, Ghost, Eye } from 'lucide-react';
import { MusicWidget } from '../widgets/MusicWidget';
import { SteamWidget } from '../widgets/SteamWidget';
import { MoviesWidget } from '../widgets/MoviesWidget';
import { BooksWidget } from '../widgets/BooksWidget';
import { TopFriendsGrid } from './TopFriendsGrid';
import { GuestbookWidget } from './GuestbookWidget';

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
  user?: any;
  nookSettings?: any;
}

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
  user,
  nookSettings
}) => {
  if (!isOpen) return null;

  const [stickers, setStickers] = useState<Sticker[]>([...initialStickers]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    initialStickers.length > 0 ? 0 : null
  );
  const [ghostCards, setGhostCards] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);

  const selectedSticker = selectedIndex !== null && stickers[selectedIndex] ? stickers[selectedIndex] : null;

  const handleAddPreset = (url: string) => {
    const newSticker: Sticker = {
      sticker_url: url,
      pos_x: 50,
      pos_y: 50,
      scale: 1,
      rotation: 0,
      layer: 'above_cards'
    };
    const updated = [...stickers, newSticker];
    setStickers(updated);
    setSelectedIndex(updated.length - 1);
    setShowPresetPicker(false);
  };

  const handleUpdateSelected = (changes: Partial<Sticker>) => {
    if (selectedIndex === null) return;
    const updated = stickers.map((st, i) => {
      if (i === selectedIndex) return { ...st, ...changes };
      return st;
    });
    setStickers(updated);
  };

  const handleDeleteSelected = () => {
    if (selectedIndex === null) return;
    const updated = stickers.filter((_, i) => i !== selectedIndex);
    setStickers(updated);
    setSelectedIndex(updated.length > 0 ? 0 : null);
  };

  const handleSaveAndClose = () => {
    onSaveStickers(stickers);
    onClose();
  };

  const customStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    overflowY: 'auto',
    backgroundColor: bgColor || '#0e0f17',
    color: textColor || '#ffffff',
    '--bg-primary': bgColor || '#0e0f17',
    '--bg-panel': cardBgColor || 'rgba(255,255,255,0.06)',
    '--accent-color': accentColor || '#6366f1',
    '--text-main': textColor || '#ffffff',
    '--border-color': borderColor || 'rgba(255,255,255,0.12)'
  } as React.CSSProperties;

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
      const parsed = typeof nookSettings.card_visibility_json === 'string'
        ? JSON.parse(nookSettings.card_visibility_json)
        : nookSettings.card_visibility_json;
      cardVisibility = { ...cardVisibility, ...parsed };
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

  return (
    <div className={`theme-${theme}`} style={customStyle}>
      {/* Floating Studio Control Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'rgba(15, 16, 29, 0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Sparkles size={24} color="var(--accent-color)" />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>Visual Sticker Studio</h2>
            <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: 0 }}>Drag, scale, and layer stickers over your live Nook page preview!</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Ghost Cards Mode Toggle Button */}
          <button
            onClick={() => setGhostCards(!ghostCards)}
            className="btn-secondary"
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: ghostCards ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.08)',
              border: ghostCards ? '1px solid var(--accent-color)' : '1px solid var(--border-color)'
            }}
            title="Ghost Cards Mode lets you click & drag stickers positioned behind cards!"
          >
            <Ghost size={16} color={ghostCards ? 'var(--accent-color)' : '#fff'} />
            <span>{ghostCards ? 'Ghost Cards ON' : 'Ghost Cards OFF'}</span>
          </button>

          <button onClick={handleSaveAndClose} className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
            <Save size={16} />
            <span>Save Stickers & Return</span>
          </button>

          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8 }}>
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Floating Toolbar Options for Selected Sticker */}
      <div style={{
        position: 'sticky',
        top: '65px',
        zIndex: 999,
        background: 'rgba(24, 26, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.6rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setShowPresetPicker(!showPresetPicker)}
            className="btn-primary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Plus size={16} />
            <span>Add Sticker</span>
          </button>
        </div>

        {selectedSticker ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            {/* Layer Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={16} color="var(--accent-color)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Layer:</span>
              <select
                value={selectedSticker.layer || 'above_cards'}
                onChange={(e) => handleUpdateSelected({ layer: e.target.value as any })}
                style={{ background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid var(--border-color)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}
              >
                <option value="above_cards">Above Cards</option>
                <option value="behind_cards">Behind Cards</option>
              </select>
            </div>

            {/* Scale Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Maximize2 size={16} color="var(--accent-color)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Scale:</span>
              <input
                type="range"
                min="0.3"
                max="3.0"
                step="0.1"
                value={selectedSticker.scale || 1.0}
                onChange={(e) => handleUpdateSelected({ scale: parseFloat(e.target.value) })}
                style={{ width: '90px' }}
              />
              <span style={{ fontSize: '0.75rem', opacity: 0.7, width: '32px' }}>{(selectedSticker.scale || 1.0).toFixed(1)}x</span>
            </div>

            {/* Rotation Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RotateCw size={16} color="var(--accent-color)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Rotation:</span>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={selectedSticker.rotation || 0}
                onChange={(e) => handleUpdateSelected({ rotation: parseInt(e.target.value) })}
                style={{ width: '90px' }}
              />
              <span style={{ fontSize: '0.75rem', opacity: 0.7, width: '36px' }}>{selectedSticker.rotation || 0}°</span>
            </div>

            {/* Delete Selected Sticker */}
            <button
              onClick={handleDeleteSelected}
              style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Trash2 size={12} />
              <span>Delete</span>
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Click any sticker on screen to edit its scale, rotation, or layer!</span>
        )}
      </div>

      {/* Preset Sticker Grid Modal / Popover */}
      {showPresetPicker && (
        <div style={{
          position: 'fixed',
          top: '110px',
          left: '1.5rem',
          zIndex: 10000,
          background: 'rgba(18, 20, 32, 0.98)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1rem',
          maxWidth: '420px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(16px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Choose Preset Sticker:</span>
            <button onClick={() => setShowPresetPicker(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto', paddingRight: '0.2rem' }}>
            {PRESET_STICKERS.map((st, i) => (
              <button
                key={i}
                onClick={() => handleAddPreset(st.url)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '6px',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.15s ease'
                }}
                title={st.name}
              >
                {st.url.startsWith('/') || st.url.startsWith('http') ? '🖼️' : st.url}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Canvas Area */}
      <div style={{ position: 'relative', minHeight: 'calc(100vh - 120px)', padding: '2rem 1rem' }}>
        {/* Layer 1: Behind Cards Stickers */}
        <StickerCanvas
          stickers={stickers}
          targetLayer="behind_cards"
          isEditing={true}
          selectedIdx={selectedIndex}
          onStickerUpdate={setStickers}
          onStickerSelect={(idx) => setSelectedIndex(idx)}
        />

        {/* Nook Profile Real Layout Preview */}
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 10,
          opacity: ghostCards ? 0.35 : 1,
          pointerEvents: ghostCards ? 'none' : 'auto',
          transition: 'all 0.2s ease'
        }}>
          {/* User Header Preview */}
          <div className="nook-panel" style={{ marginBottom: '1.5rem', position: 'relative', overflow: 'hidden', padding: 0 }}>
            {user?.banner_url ? (
              <div style={{ height: '180px', backgroundImage: `url(${user.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            ) : (
              <div style={{ height: '180px', background: 'linear-gradient(135deg, var(--accent-color) 0%, #a855f7 100%)' }} />
            )}

            <div style={{ padding: '1.5rem', marginTop: '-50px', display: 'flex', gap: '1.25rem', alignItems: 'flex-end' }}>
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                alt=""
                style={{ width: '110px', height: '110px', borderRadius: '50%', border: '4px solid var(--bg-panel-solid)', objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
              />
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: 'var(--accent-color)' }}>
                  {user?.display_name || user?.username || 'My WebNook Space'}
                </h1>
                <p style={{ opacity: 0.7, fontSize: '0.95rem', margin: '0.2rem 0 0' }}>@{user?.username || 'user'}</p>
                {user?.status_message && (
                  <p style={{ fontSize: '0.85rem', marginTop: '0.4rem', fontStyle: 'italic', color: 'var(--accent-color)' }}>
                    "{user.status_message}"
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="nook-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Bio Card */}
              {cardVisibility.bio !== false && (
                <div className="nook-panel">
                  <div className="nook-panel-header">{cardTitles.bio || 'About Me & Bio'}</div>
                  <p style={{ fontSize: '0.85rem', opacity: 0.8, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {user?.bio || 'Passionate web builder, gamer, music lover, and cozy space creator.'}
                  </p>
                </div>
              )}

              {/* Music Widget */}
              {cardVisibility.music !== false && (
                <MusicWidget
                  title={cardTitles.music || 'My Music Playlist'}
                  tracks={nookSettings?.music_tracks_json ? (typeof nookSettings.music_tracks_json === 'string' ? JSON.parse(nookSettings.music_tracks_json) : nookSettings.music_tracks_json) : []}
                  bgMusicUrl={nookSettings?.bg_music_url}
                  bgMusicTitle={nookSettings?.bg_music_title}
                  spotifyTrackUrl={nookSettings?.spotify_track_url}
                  appleMusicUrl={nookSettings?.apple_music_url}
                />
              )}

              {/* Movies & TV Widget Preview */}
              {cardVisibility.movies !== false && (
                <MoviesWidget
                  title={cardTitles.movies || 'Movies & TV Favorites'}
                  movies={nookSettings?.favorite_movies_json ? (typeof nookSettings.favorite_movies_json === 'string' ? JSON.parse(nookSettings.favorite_movies_json) : nookSettings.favorite_movies_json) : []}
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Top Friends Showcase */}
              {cardVisibility.friends !== false && (
                <TopFriendsGrid
                  title={cardTitles.friends || 'Top Friends'}
                  topFriends={nookSettings?.top_friends || []}
                  ownerUsername={user?.username || 'User'}
                />
              )}

              {/* Steam Showcase */}
              {cardVisibility.steam !== false && (
                <SteamWidget
                  steamId64={nookSettings?.steam_id64 || '76561198000000000'}
                  displayMode={nookSettings?.steam_display_mode || 'both'}
                />
              )}

              {/* Books Widget Preview */}
              {cardVisibility.books !== false && (
                <BooksWidget
                  title={cardTitles.books || 'Books & Reading Nook'}
                  books={nookSettings?.favorite_books_json ? (typeof nookSettings.favorite_books_json === 'string' ? JSON.parse(nookSettings.favorite_books_json) : nookSettings.favorite_books_json) : []}
                  storygraphUsername={nookSettings?.storygraph_username}
                />
              )}
            </div>
          </div>

          {/* Full Width Bottom Guestbook Card */}
          {cardVisibility.guestbook !== false && (
            <div style={{ marginTop: '1.5rem' }}>
              <GuestbookWidget
                title={cardTitles.guestbook || 'Guestbook & Comments'}
                nookUsername={user?.username || 'user'}
              />
            </div>
          )}
        </div>

        {/* Layer 2: Above Cards Stickers */}
        <StickerCanvas
          stickers={stickers}
          targetLayer="above_cards"
          isEditing={true}
          selectedIdx={selectedIndex}
          onStickerUpdate={setStickers}
          onStickerSelect={(idx) => setSelectedIndex(idx)}
        />
      </div>
    </div>
  );
};
