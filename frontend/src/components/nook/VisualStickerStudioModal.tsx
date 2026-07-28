import React, { useState } from 'react';
import { StickerCanvas, Sticker } from './StickerCanvas';
import { PRESET_STICKERS } from '../../constants/presetStickers';
import { X, Save, Layers, RotateCw, Maximize2, Trash2, Plus, Sparkles, Move } from 'lucide-react';

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
  borderColor
}) => {
  if (!isOpen) return null;

  const [stickers, setStickers] = useState<Sticker[]>([...initialStickers]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    initialStickers.length > 0 ? 0 : null
  );

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
            <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: 0 }}>Click and drag stickers directly over your live Nook page preview!</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
            Cancel
          </button>
          <button onClick={handleSaveAndClose} className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Save size={16} />
            <span>Save & Apply Stickers</span>
          </button>
        </div>
      </div>

      {/* Floating Controls Sub-Bar */}
      <div style={{
        position: 'sticky',
        top: '60px',
        zIndex: 999,
        background: 'rgba(24, 27, 43, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.6rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.25rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Preset Sticker Quick Add Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.8 }}>Add Sticker:</span>
          <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', maxWidth: '300px' }}>
            {PRESET_STICKERS.slice(0, 10).map((st, i) => (
              <button
                key={i}
                onClick={() => handleAddPreset(st.url)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '3px 6px',
                  fontSize: '1.1rem',
                  cursor: 'pointer'
                }}
                title={st.name}
              >
                {st.url.startsWith('/') || st.url.startsWith('http') ? '🖼️' : st.url}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Sticker Manipulator Controls */}
        {selectedSticker ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Scale Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Maximize2 size={14} style={{ opacity: 0.7 }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Scale:</span>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.1"
                value={selectedSticker.scale || 1}
                onChange={e => handleUpdateSelected({ scale: parseFloat(e.target.value) })}
                style={{ width: '80px' }}
              />
              <span style={{ fontSize: '0.75rem', opacity: 0.6, width: '32px' }}>{selectedSticker.scale || 1}x</span>
            </div>

            {/* Rotation Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RotateCw size={14} style={{ opacity: 0.7 }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Rotate:</span>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={selectedSticker.rotation || 0}
                onChange={e => handleUpdateSelected({ rotation: parseInt(e.target.value, 10) })}
                style={{ width: '80px' }}
              />
              <span style={{ fontSize: '0.75rem', opacity: 0.6, width: '36px' }}>{selectedSticker.rotation || 0}°</span>
            </div>

            {/* Layer Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={14} style={{ opacity: 0.7 }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Layer:</span>
              <select
                value={selectedSticker.layer || 'above_cards'}
                onChange={e => handleUpdateSelected({ layer: e.target.value as any })}
                style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
              >
                <option value="above_cards">Above Cards</option>
                <option value="behind_cards">Behind Cards</option>
              </select>
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
          <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>No sticker selected. Click any sticker below to edit scale/rotation!</span>
        )}
      </div>

      {/* Interactive Canvas Canvas Layer */}
      <div style={{ position: 'relative', minHeight: 'calc(100vh - 120px)', padding: '2rem 1rem' }}>
        {/* Layer 1: Behind Cards Stickers */}
        <StickerCanvas
          stickers={stickers}
          targetLayer="behind_cards"
          isEditing={true}
          onStickerUpdate={setStickers}
        />

        {/* Nook Layout Mock Preview */}
        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <div className="nook-panel" style={{ marginBottom: '1.5rem', padding: '1.5rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-color)' }}>Interactive Sticker Canvas Area</h1>
            <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Drag any sticker around your cards to place it anywhere on your page!</p>
          </div>

          <div className="nook-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="nook-panel" style={{ height: '220px' }}>
              <div className="nook-panel-header">Sample Card (Left Column)</div>
              <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Stickers can float on top of or behind this panel!</p>
            </div>
            <div className="nook-panel" style={{ height: '220px' }}>
              <div className="nook-panel-header">Sample Card (Right Column)</div>
              <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Drag stickers across both columns seamlessly.</p>
            </div>
          </div>
        </div>

        {/* Layer 2: Above Cards Stickers */}
        <StickerCanvas
          stickers={stickers}
          targetLayer="above_cards"
          isEditing={true}
          onStickerUpdate={setStickers}
        />
      </div>
    </div>
  );
};
