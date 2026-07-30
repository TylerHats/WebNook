import { ThemeDefinition } from '../types';

export const liquidGlassTheme: ThemeDefinition = {
  id: 'liquid-glass',
  name: 'Liquid Crystal Glass',
  category: 'general',
  description: 'Ultra-pure glossy liquid glassmorphism with iridescent specular highlights & ripple pops',
  badge: '💧',
  palette: {
    bg: '#050814',
    cardBg: 'rgba(255, 255, 255, 0.08)',
    accent: '#38bdf8',
    text: '#ffffff',
    border: 'rgba(255, 255, 255, 0.25)'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-liquid-glass',
  previewStyle: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    borderRadius: '24px',
    borderStyle: 'solid',
    borderWidth: '1.5px',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    headerBg: 'linear-gradient(135deg, rgba(56, 189, 248, 0.4) 0%, rgba(192, 132, 252, 0.4) 100%)',
    cardBg: 'rgba(255, 255, 255, 0.12)',
    accentGlow: '0 12px 40px rgba(56, 189, 248, 0.5)',
    badge: '💧',
    decorIcons: ['💧', '✨', '🔮']
  }
};
