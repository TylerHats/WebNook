import React from 'react';

export interface Sticker {
  id?: number;
  sticker_url: string;
  pos_x: number;
  pos_y: number;
  scale: number;
  rotation: number;
  z_index?: number;
  layer?: 'above_cards' | 'behind_cards';
}

interface StickerCanvasProps {
  stickers: Sticker[];
  targetLayer?: 'above_cards' | 'behind_cards';
}

export const StickerCanvas: React.FC<StickerCanvasProps> = ({ stickers, targetLayer = 'above_cards' }) => {
  // Filter stickers by target layer (default to 'above_cards' if unassigned)
  const filtered = stickers.filter(s => {
    const sLayer = s.layer || 'above_cards';
    return sLayer === targetLayer;
  });

  if (filtered.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: targetLayer === 'behind_cards' ? 1 : 40,
        overflow: 'hidden'
      }}
    >
      {filtered.map((sticker, idx) => {
        const isEmoji = !sticker.sticker_url.startsWith('/') && !sticker.sticker_url.startsWith('http');
        const zIndex = sticker.z_index || (targetLayer === 'behind_cards' ? 1 + idx : 40 + idx);

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: `${sticker.pos_y}%`,
              left: `${sticker.pos_x}%`,
              transform: `translate(-50%, -50%) scale(${sticker.scale || 1}) rotate(${sticker.rotation || 0}deg)`,
              zIndex: zIndex,
              userSelect: 'none',
              pointerEvents: 'none',
              transition: 'transform 0.1s ease'
            }}
          >
            {isEmoji ? (
              <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                {sticker.sticker_url}
              </span>
            ) : (
              <img
                src={sticker.sticker_url}
                alt="Sticker"
                style={{
                  maxHeight: '120px',
                  maxWidth: '120px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.35))'
                }}
                draggable={false}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
