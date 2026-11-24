import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCw, Trash2 } from 'lucide-react';

export interface Sticker {
  id?: number;
  sticker_url: string;
  pos_x: number;
  pos_y: number;
  scale: number;
  rotation: number;
  z_index?: number;
  layer?: 'above_cards' | 'behind_cards';
  anchor_type?: 'container' | 'card';
  anchor_id?: string;
}

interface RelativeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface LayoutMetrics {
  width: number;
  height: number;
  anchors: Record<string, RelativeRect>;
}

interface StickerCanvasProps {
  stickers: Sticker[];
  targetLayer?: 'above_cards' | 'behind_cards';
  isEditing?: boolean;
  selectedIdx?: number | null;
  containerRef?: React.RefObject<HTMLElement>;
  highlightAnchorId?: string | null;
  onStickerUpdate?: (stickers: Sticker[]) => void;
  onStickerSelect?: (originalIdx: number) => void;
  onStickerDelete?: (originalIdx: number) => void;
  onDragStartSnapshot?: () => void;
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
const round1 = (val: number) => Math.round(val * 10) / 10;
const round2 = (val: number) => Math.round(val * 100) / 100;

/**
 * Seamlessly converts a sticker's coordinates between `'container'` and `'card'` anchors
 * (or between two different cards) without visibly shifting its current position on canvas.
 */
export function convertStickerAnchor(
  sticker: Sticker,
  nextType: 'container' | 'card',
  nextAnchorId: string,
  rootEl: HTMLElement | null
): Sticker {
  if (!rootEl) {
    return {
      ...sticker,
      anchor_type: nextType,
      anchor_id: nextType === 'card' ? nextAnchorId : ''
    };
  }

  const rootRect = rootEl.getBoundingClientRect();
  if (rootRect.width <= 0 || rootRect.height <= 0) {
    return {
      ...sticker,
      anchor_type: nextType,
      anchor_id: nextType === 'card' ? nextAnchorId : ''
    };
  }

  // Compute current pixel center relative to rootEl
  let pxX = (sticker.pos_x / 100) * rootRect.width;
  let pxY = (sticker.pos_y / 100) * rootRect.height;

  if (sticker.anchor_type === 'card' && sticker.anchor_id) {
    const oldEl = rootEl.querySelector(`[data-sticker-anchor="${CSS.escape(sticker.anchor_id)}"]`);
    if (oldEl) {
      const oldRect = oldEl.getBoundingClientRect();
      if (oldRect.width > 0 && oldRect.height > 0) {
        pxX = (oldRect.left - rootRect.left) + (sticker.pos_x / 100) * oldRect.width;
        pxY = (oldRect.top - rootRect.top) + (sticker.pos_y / 100) * oldRect.height;
      }
    }
  }

  if (nextType === 'container') {
    return {
      ...sticker,
      anchor_type: 'container',
      anchor_id: '',
      pos_x: round1(clamp((pxX / rootRect.width) * 100, 0, 100)),
      pos_y: round1(clamp((pxY / rootRect.height) * 100, 0, 100))
    };
  }

  const targetEl = rootEl.querySelector(`[data-sticker-anchor="${CSS.escape(nextAnchorId)}"]`);
  if (!targetEl) {
    return {
      ...sticker,
      anchor_type: 'card',
      anchor_id: nextAnchorId,
      pos_x: 50,
      pos_y: 50
    };
  }

  const targetRect = targetEl.getBoundingClientRect();
  if (targetRect.width <= 0 || targetRect.height <= 0) {
    return {
      ...sticker,
      anchor_type: 'card',
      anchor_id: nextAnchorId,
      pos_x: 50,
      pos_y: 50
    };
  }

  const relX = pxX - (targetRect.left - rootRect.left);
  const relY = pxY - (targetRect.top - rootRect.top);
  return {
    ...sticker,
    anchor_type: 'card',
    anchor_id: nextAnchorId,
    pos_x: round1(clamp((relX / targetRect.width) * 100, 0, 100)),
    pos_y: round1(clamp((relY / targetRect.height) * 100, 0, 100))
  };
}

export const StickerCanvas: React.FC<StickerCanvasProps> = ({
  stickers,
  targetLayer = 'above_cards',
  isEditing = false,
  selectedIdx,
  containerRef,
  highlightAnchorId,
  onStickerUpdate,
  onStickerSelect,
  onStickerDelete,
  onDragStartSnapshot
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<LayoutMetrics>({ width: 0, height: 0, anchors: {} });

  const stickersRef = useRef(stickers);
  stickersRef.current = stickers;

  const dragSessionRef = useRef<{
    mode: 'move' | 'scale' | 'rotate';
    idx: number;
    pointerId: number;
    pointerOffsetX: number;
    pointerOffsetY: number;
    centerX: number;
    centerY: number;
    startDist: number;
    startScale: number;
    startAngle: number;
    startRotation: number;
  } | null>(null);

  const rafIdRef = useRef<number | null>(null);

  const measureLayout = useCallback(() => {
    const rootEl = containerRef?.current || canvasRef.current;
    if (!rootEl) return;

    const rootRect = rootEl.getBoundingClientRect();
    const anchorEls = rootEl.querySelectorAll('[data-sticker-anchor]');
    const nextAnchors: Record<string, RelativeRect> = {};

    anchorEls.forEach((el) => {
      const id = el.getAttribute('data-sticker-anchor');
      if (!id) return;
      const r = el.getBoundingClientRect();
      nextAnchors[id] = {
        left: r.left - rootRect.left,
        top: r.top - rootRect.top,
        width: r.width,
        height: r.height
      };
    });

    setMetrics((prev) => {
      const prevKeys = Object.keys(prev.anchors);
      const nextKeys = Object.keys(nextAnchors);
      if (
        Math.abs(prev.width - rootRect.width) < 0.5 &&
        Math.abs(prev.height - rootRect.height) < 0.5 &&
        prevKeys.length === nextKeys.length &&
        nextKeys.every((k) => {
          const a = prev.anchors[k];
          const b = nextAnchors[k];
          return (
            a &&
            Math.abs(a.left - b.left) < 0.5 &&
            Math.abs(a.top - b.top) < 0.5 &&
            Math.abs(a.width - b.width) < 0.5 &&
            Math.abs(a.height - b.height) < 0.5
          );
        })
      ) {
        return prev;
      }
      return { width: rootRect.width, height: rootRect.height, anchors: nextAnchors };
    });
  }, [containerRef]);

  const scheduleMeasure = useCallback(() => {
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      measureLayout();
    });
  }, [measureLayout]);

  useEffect(() => {
    const rootEl = containerRef?.current || canvasRef.current;
    if (!rootEl) return;

    measureLayout();

    const ro = new ResizeObserver(() => scheduleMeasure());
    ro.observe(rootEl);

    const observedAnchors = new Set<Element>();
    const syncObservedAnchors = () => {
      const current = rootEl.querySelectorAll('[data-sticker-anchor]');
      current.forEach((el) => {
        if (!observedAnchors.has(el)) {
          ro.observe(el);
          observedAnchors.add(el);
        }
      });
    };
    syncObservedAnchors();

    const mo = new MutationObserver(() => {
      syncObservedAnchors();
      scheduleMeasure();
    });
    mo.observe(rootEl, { childList: true, subtree: true });

    window.addEventListener('resize', scheduleMeasure);
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [containerRef, measureLayout, scheduleMeasure, stickers.length]);

  const getReferenceRect = (sticker: Sticker): DOMRect | null => {
    const rootEl = containerRef?.current || canvasRef.current;
    if (!rootEl) return null;
    if (sticker.anchor_type === 'card' && sticker.anchor_id) {
      const anchorEl = rootEl.querySelector(`[data-sticker-anchor="${CSS.escape(sticker.anchor_id)}"]`);
      if (anchorEl) {
        const r = anchorEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return r;
      }
    }
    const r = rootEl.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  };

  const handleMovePointerDown = (originalIdx: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    e.stopPropagation();
    e.preventDefault();

    onDragStartSnapshot?.();
    onStickerSelect?.(originalIdx);

    const elRect = e.currentTarget.getBoundingClientRect();
    const centerX = elRect.left + elRect.width / 2;
    const centerY = elRect.top + elRect.height / 2;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    setDraggingIdx(originalIdx);
    dragSessionRef.current = {
      mode: 'move',
      idx: originalIdx,
      pointerId: e.pointerId,
      pointerOffsetX: centerX - e.clientX,
      pointerOffsetY: centerY - e.clientY,
      centerX,
      centerY,
      startDist: 1,
      startScale: stickers[originalIdx]?.scale || 1,
      startAngle: 0,
      startRotation: stickers[originalIdx]?.rotation || 0
    };
  };

  const handleTransformPointerDown = (
    mode: 'scale' | 'rotate',
    originalIdx: number,
    stickerWrapperEl: HTMLElement | null,
    e: React.PointerEvent<HTMLElement>
  ) => {
    if (!isEditing || !stickerWrapperEl) return;
    e.stopPropagation();
    e.preventDefault();

    onDragStartSnapshot?.();
    onStickerSelect?.(originalIdx);

    const elRect = stickerWrapperEl.getBoundingClientRect();
    const centerX = elRect.left + elRect.width / 2;
    const centerY = elRect.top + elRect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const startDist = Math.max(12, Math.hypot(dx, dy));
    const startAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    setDraggingIdx(originalIdx);
    dragSessionRef.current = {
      mode,
      idx: originalIdx,
      pointerId: e.pointerId,
      pointerOffsetX: 0,
      pointerOffsetY: 0,
      centerX,
      centerY,
      startDist,
      startScale: stickers[originalIdx]?.scale || 1,
      startAngle,
      startRotation: stickers[originalIdx]?.rotation || 0
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const session = dragSessionRef.current;
    if (!session || !onStickerUpdate) return;
    const currentList = stickersRef.current;
    const targetSticker = currentList[session.idx];
    if (!targetSticker) return;

    if (session.mode === 'move') {
      const refRect = getReferenceRect(targetSticker);
      if (!refRect) return;
      const cx = e.clientX + session.pointerOffsetX;
      const cy = e.clientY + session.pointerOffsetY;
      const nextX = round1(clamp(((cx - refRect.left) / refRect.width) * 100, 0, 100));
      const nextY = round1(clamp(((cy - refRect.top) / refRect.height) * 100, 0, 100));

      onStickerUpdate(
        currentList.map((st, i) => (i === session.idx ? { ...st, pos_x: nextX, pos_y: nextY } : st))
      );
      return;
    }

    if (session.mode === 'scale') {
      const dist = Math.max(8, Math.hypot(e.clientX - session.centerX, e.clientY - session.centerY));
      const nextScale = round2(clamp(session.startScale * (dist / session.startDist), 0.2, 4.0));
      onStickerUpdate(
        currentList.map((st, i) => (i === session.idx ? { ...st, scale: nextScale } : st))
      );
      return;
    }

    if (session.mode === 'rotate') {
      const angle = (Math.atan2(e.clientY - session.centerY, e.clientX - session.centerX) * 180) / Math.PI;
      let delta = angle - session.startAngle;
      let raw = session.startRotation + delta;
      // Wrap into [-180, 180]
      while (raw > 180) raw -= 360;
      while (raw < -180) raw += 360;
      const nextRot = e.shiftKey ? Math.round(raw / 15) * 15 : Math.round(raw);
      onStickerUpdate(
        currentList.map((st, i) => (i === session.idx ? { ...st, rotation: nextRot } : st))
      );
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLElement>) => {
    const session = dragSessionRef.current;
    if (!session) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    dragSessionRef.current = null;
    setDraggingIdx(null);
  };

  // Filter stickers by target layer
  const filteredIndices = stickers
    .map((s, originalIdx) => ({ s, originalIdx }))
    .filter((item) => (item.s.layer || 'above_cards') === targetLayer);

  if (filteredIndices.length === 0 && !isEditing) return null;

  const responsiveScale = metrics.width > 0 ? Math.max(0.55, Math.min(1, metrics.width / 1000)) : 1;

  const selectedSticker =
    isEditing && selectedIdx !== null && selectedIdx !== undefined ? stickers[selectedIdx] : null;
  const activeHighlightAnchor =
    isEditing && selectedSticker && (selectedSticker.layer || 'above_cards') === targetLayer && selectedSticker.anchor_type === 'card'
      ? selectedSticker.anchor_id
      : highlightAnchorId;
  const activeAnchorRect = activeHighlightAnchor ? metrics.anchors[activeHighlightAnchor] : null;

  return (
    <div
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: targetLayer === 'behind_cards' ? 5 : 40,
        overflow: 'visible'
      }}
    >
      {/* Subtle dashed highlight around currently anchored card in edit mode */}
      {isEditing && activeAnchorRect && (
        <div
          style={{
            position: 'absolute',
            left: `${activeAnchorRect.left}px`,
            top: `${activeAnchorRect.top}px`,
            width: `${activeAnchorRect.width}px`,
            height: `${activeAnchorRect.height}px`,
            border: '2px dashed rgba(99, 102, 241, 0.75)',
            borderRadius: '14px',
            boxShadow: 'inset 0 0 20px rgba(99, 102, 241, 0.14)',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />
      )}

      {filteredIndices.map(({ s: sticker, originalIdx }) => {
        const isEmoji =
          !sticker.sticker_url.startsWith('/') &&
          !sticker.sticker_url.startsWith('http') &&
          !sticker.sticker_url.startsWith('data:');
        const baseZ = sticker.z_index || (targetLayer === 'behind_cards' ? 5 + originalIdx : 40 + originalIdx);
        const isDragging = draggingIdx === originalIdx;
        const isSelected = selectedIdx === originalIdx;

        // Compute deterministic coordinates inside container or anchored card
        let posLeftStyle = `${sticker.pos_x}%`;
        let posTopStyle = `${sticker.pos_y}%`;

        if (sticker.anchor_type === 'card' && sticker.anchor_id) {
          const anchorRect = metrics.anchors[sticker.anchor_id];
          if (anchorRect && anchorRect.width > 0 && anchorRect.height > 0) {
            posLeftStyle = `${anchorRect.left + (sticker.pos_x / 100) * anchorRect.width}px`;
            posTopStyle = `${anchorRect.top + (sticker.pos_y / 100) * anchorRect.height}px`;
          } else if (metrics.width > 0 && metrics.height > 0) {
            posLeftStyle = `${(sticker.pos_x / 100) * metrics.width}px`;
            posTopStyle = `${(sticker.pos_y / 100) * metrics.height}px`;
          }
        } else if (metrics.width > 0 && metrics.height > 0) {
          posLeftStyle = `${(sticker.pos_x / 100) * metrics.width}px`;
          posTopStyle = `${(sticker.pos_y / 100) * metrics.height}px`;
        }

        const effectiveScale = round2((sticker.scale || 1) * responsiveScale);

        return (
          <div
            key={originalIdx}
            onPointerDown={(e) => handleMovePointerDown(originalIdx, e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            style={{
              position: 'absolute',
              top: posTopStyle,
              left: posLeftStyle,
              transform: `translate(-50%, -50%) scale(${effectiveScale}) rotate(${sticker.rotation || 0}deg)`,
              zIndex: isDragging ? 200 : isSelected ? 150 : baseZ,
              userSelect: 'none',
              touchAction: isEditing ? 'none' : 'auto',
              cursor: isEditing ? (isDragging ? 'grabbing' : 'grab') : 'default',
              pointerEvents: isEditing ? 'auto' : 'none',
              padding: isEditing ? '6px' : '0px',
              borderRadius: '10px',
              border: isEditing
                ? isSelected
                  ? '2px solid #6366f1'
                  : '1px dashed rgba(255,255,255,0.45)'
                : 'none',
              boxShadow: isEditing && isSelected ? '0 0 14px rgba(99, 102, 241, 0.65)' : 'none',
              background: isEditing
                ? isDragging
                  ? 'rgba(99, 102, 241, 0.28)'
                  : isSelected
                  ? 'rgba(99, 102, 241, 0.14)'
                  : 'transparent'
                : 'transparent'
            }}
          >
            {/* Direct On-Canvas Selected Handles */}
            {isEditing && isSelected && (
              <>
                {onStickerDelete && (
                  <button
                    type="button"
                    title="Delete Sticker"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStickerDelete(originalIdx);
                    }}
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      right: '-12px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #fff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                      cursor: 'pointer',
                      zIndex: 5
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                )}

                {/* Top Rotation Handle */}
                <div
                  title="Drag to Rotate (hold Shift for 15° snap)"
                  onPointerDown={(e) =>
                    handleTransformPointerDown('rotate', originalIdx, e.currentTarget.parentElement, e)
                  }
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                  style={{
                    position: 'absolute',
                    top: '-22px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#6366f1',
                    color: '#fff',
                    border: '2px solid #fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'crosshair',
                    touchAction: 'none',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    zIndex: 5
                  }}
                >
                  <RotateCw size={10} />
                </div>

                {/* Bottom-Right Resize Handle */}
                <div
                  title="Drag to Resize"
                  onPointerDown={(e) =>
                    handleTransformPointerDown('scale', originalIdx, e.currentTarget.parentElement, e)
                  }
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                  style={{
                    position: 'absolute',
                    bottom: '-10px',
                    right: '-10px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    background: '#22c55e',
                    border: '2px solid #fff',
                    cursor: 'nwse-resize',
                    touchAction: 'none',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    zIndex: 5
                  }}
                />
              </>
            )}

            {isEmoji ? (
              <span
                style={{
                  fontSize: '2.6rem',
                  lineHeight: 1,
                  display: 'inline-block',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                }}
              >
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
                  display: 'block',
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
