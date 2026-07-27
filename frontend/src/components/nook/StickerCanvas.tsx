import React from 'react';

export interface Sticker {
  id?: number;
  sticker_url: string;
  pos_x: number; // percentage or px
  pos_y: number;
  scale: number;
  rotation: number;
}

interface StickerCanvasProps {
  stickers: Sticker[];
  isEditing?: boolean;
  onStickerChange?: (stickers: Sticker[]) => void;
}

export const StickerCanvas: React.FC<StickerCanvasProps> = ({ stickers, isEditing = false, onStickerChange }) => {
  return (
    <div className="sticker-canvas-container">
      {stickers.map((sticker, idx) => (
        <div
          key={idx}
          className="sticker-item"
          style={{
            top: `${sticker.pos_y}%`,
            left: `${sticker.pos_x}%`,
            transform: `scale(${sticker.scale || 1}) rotate(${sticker.rotation || 0}deg)`,
            zIndex: 50 + idx
          }}
        >
          <img
            src={sticker.sticker_url}
            alt="Sticker"
            className="sticker-image"
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
};
