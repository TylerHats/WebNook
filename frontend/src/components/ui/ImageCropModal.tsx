import React, { useState, useEffect, useRef } from 'react';
import { Crop, ZoomIn, ZoomOut, Check, X } from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageFile: File | null;
  title?: string;
  aspectRatio?: number; // 1 for square (avatar), 3 for banner (3:1), 1 for sticker
  onCropComplete: (croppedFile: File) => void;
  onClose: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageFile,
  title = 'Crop Image',
  aspectRatio = 1,
  onCropComplete,
  onClose
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImgSrc(url);
      setZoom(1);
      setPan({ x: 0, y: 0 });

      const img = new Image();
      img.src = url;
      img.onload = () => {
        imgRef.current = img;
        drawCanvas(img, 1, 0, 0);
      };

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setImgSrc(null);
      imgRef.current = null;
      return () => {};
    }
  }, [imageFile]);

  const drawCanvas = (img: HTMLImageElement, currentZoom: number, panX: number, panY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw scaled & panned image centered
    const baseScale = Math.min(canvasWidth / img.width, canvasHeight / img.height) * 0.8;
    const scale = baseScale * currentZoom;

    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (canvasWidth - drawW) / 2 + panX;
    const drawY = (canvasHeight - drawH) / 2 + panY;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Draw crop guide box overlay
    let cropW = canvasWidth * 0.75;
    let cropH = cropW / (aspectRatio || 1);

    if (cropH > canvasHeight * 0.75) {
      cropH = canvasHeight * 0.75;
      cropW = cropH * (aspectRatio || 1);
    }

    const cropX = (canvasWidth - cropW) / 2;
    const cropY = (canvasHeight - cropH) / 2;

    // Dim background around crop box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.rect(0, 0, canvasWidth, canvasHeight);
    ctx.rect(cropX, cropY, cropW, cropH);
    ctx.fill('evenodd');

    // Crop box outline
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 8;
    ctx.strokeRect(cropX, cropY, cropW, cropH);
    ctx.shadowBlur = 0;
  };

  useEffect(() => {
    if (imgRef.current) {
      drawCanvas(imgRef.current, zoom, pan.x, pan.y);
    }
  }, [zoom, pan]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCropSave = () => {
    const img = imgRef.current;
    if (!img || !imageFile) return;

    const canvasWidth = 400;
    const canvasHeight = 300;

    let cropW = canvasWidth * 0.75;
    let cropH = cropW / (aspectRatio || 1);

    if (cropH > canvasHeight * 0.75) {
      cropH = canvasHeight * 0.75;
      cropW = cropH * (aspectRatio || 1);
    }

    const cropX = (canvasWidth - cropW) / 2;
    const cropY = (canvasHeight - cropH) / 2;

    const baseScale = Math.min(canvasWidth / img.width, canvasHeight / img.height) * 0.8;
    const scale = baseScale * zoom;

    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (canvasWidth - drawW) / 2 + pan.x;
    const drawY = (canvasHeight - drawH) / 2 + pan.y;

    // Calculate crop area relative to original image source
    const srcX = Math.max(0, (cropX - drawX) / scale);
    const srcY = Math.max(0, (cropY - drawY) / scale);
    const srcW = Math.min(img.width - srcX, cropW / scale);
    const srcH = Math.min(img.height - srcY, cropH / scale);

    // Render high-res output canvas
    const outputCanvas = document.createElement('canvas');
    const outW = aspectRatio >= 2 ? 1200 : 600;
    const outH = outW / (aspectRatio || 1);
    outputCanvas.width = outW;
    outputCanvas.height = outH;

    const outCtx = outputCanvas.getContext('2d');
    if (!outCtx) return;

    outCtx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

    outputCanvas.toBlob((blob) => {
      if (!blob) return;
      const croppedFile = new File([blob], imageFile.name || 'cropped-image.png', {
        type: 'image/png'
      });
      onCropComplete(croppedFile);
      onClose();
    }, 'image/png');
  };

  if (!isOpen || !imageFile) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: '#1e293b',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '16px',
        padding: '1.5rem',
        maxWidth: '460px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        color: '#f8fafc'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Crop size={20} color="var(--accent-color, #38bdf8)" />
            <span>{title}</span>
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.75rem' }}>
          Drag the image to adjust position and use the slider to zoom in or out before saving.
        </p>

        {/* Interactive Canvas Viewport */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            width: '100%',
            height: '300px',
            borderRadius: '10px',
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            marginBottom: '1rem',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <canvas
            ref={canvasRef}
            width={400}
            height={300}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>

        {/* Zoom Slider Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <ZoomOut size={16} opacity={0.6} />
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent-color, #38bdf8)' }}
          />
          <ZoomIn size={16} opacity={0.6} />
          <span style={{ fontSize: '0.8rem', minWidth: '40px', textAlign: 'right', fontWeight: 600 }}>{Math.round(zoom * 100)}%</span>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Cancel
          </button>
          <button type="button" onClick={handleCropSave} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Check size={16} />
            <span>Apply Crop & Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
