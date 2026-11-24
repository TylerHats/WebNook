import React from 'react';

export type BorderRadiusPreset = '' | 'sharp' | 'soft' | 'rounded' | 'pill';
export type GlassBlurPreset = '' | 'none' | 'subtle' | 'medium' | 'frosted';
export type GlowIntensityPreset = '' | 'none' | 'soft' | 'vibrant';
export type FontOverridePreset =
  | ''
  | 'outfit'
  | 'space-grotesk'
  | 'fredoka'
  | 'playfair'
  | 'jetbrains'
  | 'vt323'
  | 'press-start';
export type BgPatternPreset = '' | 'none' | 'dots' | 'grid' | 'scanlines' | 'stars' | 'diagonal';

export interface NookStyleOverrides {
  cardBg?: string;
  border?: string;
  borderRadius?: BorderRadiusPreset;
  glassBlur?: GlassBlurPreset;
  glowIntensity?: GlowIntensityPreset;
  fontOverride?: FontOverridePreset;
  bgPattern?: BgPatternPreset;
}

const RADIUS_MAP: Record<Exclude<BorderRadiusPreset, ''>, string> = {
  sharp: '2px',
  soft: '10px',
  rounded: '20px',
  pill: '28px'
};

const BLUR_MAP: Record<Exclude<GlassBlurPreset, ''>, string> = {
  none: 'none',
  subtle: 'blur(8px)',
  medium: 'blur(18px)',
  frosted: 'blur(30px) saturate(160%)'
};

const FONT_MAP: Record<Exclude<FontOverridePreset, ''>, string> = {
  outfit: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
  'space-grotesk': "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  fredoka: "'Fredoka', 'Outfit', sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  jetbrains: "'JetBrains Mono', monospace",
  vt323: "'VT323', monospace",
  'press-start': "'Press Start 2P', monospace"
};

/**
 * Safely parses `card_colors_json` (stored either as JSON string or parsed object) into style overrides.
 */
export function parseNookStyleOverrides(raw: unknown): NookStyleOverrides {
  if (!raw) return {};
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== 'object') return {};
    const src = obj as Record<string, any>;
    return {
      cardBg: typeof src.cardBg === 'string' ? src.cardBg : undefined,
      border: typeof src.border === 'string' ? src.border : undefined,
      borderRadius: ['sharp', 'soft', 'rounded', 'pill'].includes(src.borderRadius) ? src.borderRadius : '',
      glassBlur: ['none', 'subtle', 'medium', 'frosted'].includes(src.glassBlur) ? src.glassBlur : '',
      glowIntensity: ['none', 'soft', 'vibrant'].includes(src.glowIntensity) ? src.glowIntensity : '',
      fontOverride: [
        'outfit',
        'space-grotesk',
        'fredoka',
        'playfair',
        'jetbrains',
        'vt323',
        'press-start'
      ].includes(src.fontOverride)
        ? src.fontOverride
        : '',
      bgPattern: ['none', 'dots', 'grid', 'scanlines', 'stars', 'diagonal'].includes(src.bgPattern)
        ? src.bgPattern
        : ''
    };
  } catch {
    return {};
  }
}

/**
 * Normalizes any CSS color string (hex, rgba, etc.) to a 7-char hex value suitable for `<input type="color">`.
 */
export function toHexInputFallback(color: string | undefined | null, fallback = '#181b2b'): string {
  if (!color || typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return (
      '#' +
      trimmed[1] + trimmed[1] +
      trimmed[2] + trimmed[2] +
      trimmed[3] + trimmed[3]
    );
  }
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (rgbMatch) {
    const toHex = (n: string) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0');
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }
  return fallback;
}

/**
 * Produces consistent root className + CSS custom properties used across NookViewPage,
 * NookCustomizerPage, and VisualStickerStudioModal.
 */
export function buildNookRootProps({
  theme,
  bgColor,
  textColor,
  accentColor,
  overrides
}: {
  theme?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  overrides?: NookStyleOverrides;
}): { className: string; style: React.CSSProperties } {
  const safeTheme = theme || 'glassmorphism';
  const classes = [`theme-${safeTheme}`];

  if (overrides?.bgPattern && overrides.bgPattern !== 'none') {
    classes.push(`nook-pattern-${overrides.bgPattern}`);
  }
  if (overrides?.glowIntensity) {
    classes.push(`nook-glow-${overrides.glowIntensity}`);
  }

  const styleVars: Record<string, string | number | undefined> = {
    minHeight: '100vh',
    position: 'relative',
    backgroundColor: bgColor || undefined,
    color: textColor || undefined,
    '--bg-primary': bgColor || undefined,
    '--bg-panel': overrides?.cardBg || undefined,
    '--accent-color': accentColor || undefined,
    '--text-main': textColor || undefined,
    '--border-color': overrides?.border || undefined
  };

  if (overrides?.borderRadius && RADIUS_MAP[overrides.borderRadius]) {
    styleVars['--border-radius-main'] = RADIUS_MAP[overrides.borderRadius];
  }
  if (overrides?.glassBlur && BLUR_MAP[overrides.glassBlur]) {
    styleVars['--backdrop-blur'] = BLUR_MAP[overrides.glassBlur];
  }
  if (overrides?.fontOverride && FONT_MAP[overrides.fontOverride]) {
    styleVars['--font-family-main'] = FONT_MAP[overrides.fontOverride];
  }

  return {
    className: classes.join(' '),
    style: styleVars as React.CSSProperties
  };
}

