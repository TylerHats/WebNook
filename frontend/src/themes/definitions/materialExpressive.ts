import { ThemeDefinition } from '../types';

export const materialExpressiveTheme: ThemeDefinition = {
  id: 'material-expressive',
  name: 'Material You Expressive',
  category: 'general',
  description: 'Android Material 3 Expressive pill shapes, tonal pastel palettes & haptic pop feedback',
  badge: '🎨',
  palette: {
    bg: '#1c1b1f',
    cardBg: 'rgba(230, 225, 229, 0.08)',
    accent: '#d0bcff',
    text: '#e6e1e5',
    border: 'rgba(208, 188, 255, 0.3)'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-material-expressive',
  previewStyle: {
    fontFamily: "'Roboto Flex', 'Google Sans', sans-serif",
    borderRadius: '28px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'rgba(208, 188, 255, 0.35)',
    headerBg: 'linear-gradient(90deg, #d0bcff 0%, #ffb4ab 100%)',
    cardBg: 'rgba(230, 225, 229, 0.12)',
    accentGlow: '0 8px 24px rgba(208, 188, 255, 0.4)',
    badge: '🎨',
    decorIcons: ['🎨', '📱', '✨']
  }
};
