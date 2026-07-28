import React, { useState, useRef, useEffect } from 'react';

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
  isEditing?: boolean;
  onStickerUpdate?: (stickers: Sticker[]) => void;
}

export const StickerCanvas: React.FC<StickerCanvasProps> = ({
  stickers,
  targetLayer = 'above_cards',
  isEditing = false,
  onStickerUpdate
}) => {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter stickers by layer
  const filteredIndices = stickers
    .map((s, originalIdx) => ({ s, originalIdx }))
    .filter(item => (item.s.layer || 'above_cards') === targetLayer);

  if (filteredIndices.length === 0 && !isEditing) return null;

  const handlePointerDown = (originalIdx: number, e: React.PointerEvent) => {
    if (!isEditing) return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingIdx(originalIdx);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingIdx === null || !containerRef.current || !onStickerUpdate) return;
    const rect = containerRef.current.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newPosX = Math.max(0, Math.min(100, Math.round((mouseX / rect.width) * 100)));
    const newPosY = Math.max(0, Math.min(100, Math.round((mouseY / rect.height) * 100)));

    const updated = stickers.map((st, i) => {
      if (i === draggingIdx) {
        return { ...st, pos_x: newPosX, pos_y: newPosY };
      }
      return st;
    });

    onStickerUpdate(updated);
  };

  const handlePointerUp = () => {
    if (draggingIdx !== null) {
      setDraggingIdx(null);
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: isEditing ? 'auto' : 'none',
        zIndex: targetLayer === 'behind_cards' ? 1 : 40,
        overflow: 'hidden'
      }}
    >
      {filteredIndices.map(({ s: sticker, originalIdx }) => {
        const isEmoji = !sticker.sticker_url.startsWith('/') && !sticker.sticker_url.startsWith('http');
        const zIndex = sticker.z_index || (targetLayer === 'behind_cards' ? 1 + originalIdx : 40 + originalIdx);
        const isDragging = draggingIdx === originalIdx;

        return (
          <div
            key={originalIdx}
            onPointerDown={(e) => handlePointerDown(originalIdx, e)}
            style={{
              position: 'absolute',
              top: `${sticker.pos_y}%`,
              left: `${sticker.pos_x}%`,
              transform: `translate(-50%, -50%) scale(${sticker.scale || 1}) rotate(${sticker.rotation || 0}deg)`,
              zIndex: isDragging ? 100 : zIndex,
              userSelect: 'none',
              cursor: isEditing ? (isDragging ? 'grabbing' : 'grab') : 'default',
              pointerEvents: isEditing ? 'auto' : 'none',
              padding: '6px',
              borderRadius: '8px',
              border: isEditing ? (isDragging ? '2px dashed var(--accent-color)' : '1px dashed rgba(255,255,255,0.4)') : 'none',
              background: isDragging ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              transition: isDragging ? 'none' : 'transform 0.1s ease'
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
