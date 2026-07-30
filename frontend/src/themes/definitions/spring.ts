import { ThemeDefinition } from '../types';

export const springTheme: ThemeDefinition = {
  id: 'spring',
  name: 'Spring Blossom',
  category: 'seasonal',
  description: 'Sakura blossom pink & meadow green with floating petals & windchime audio',
  badge: '🌸',
  palette: {
    bg: '#fdf2f8',
    cardBg: 'rgba(255, 255, 255, 0.85)',
    accent: '#ec4899',
    text: '#831843',
    border: '#f472b6'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-spring',
  previewStyle: {
    fontFamily: 'Inter, sans-serif',
    borderRadius: '18px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: '#f472b6',
    headerBg: 'linear-gradient(90deg, #f472b6 0%, #34d399 100%)',
    cardBg: 'rgba(255, 255, 255, 0.9)',
    accentGlow: '0 0 16px rgba(236, 72, 153, 0.35)',
    badge: '🌸',
    decorIcons: ['🌸', '🦋', '🌱']
  }
};
