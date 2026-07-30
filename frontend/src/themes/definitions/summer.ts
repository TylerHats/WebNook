import { ThemeDefinition } from '../types';

export const summerTheme: ThemeDefinition = {
  id: 'summer',
  name: 'Tropical Summer Sun',
  category: 'seasonal',
  description: 'Ocean turquoise & warm golden sand with sunburst reflections & tropical wave surge',
  badge: '☀️',
  palette: {
    bg: '#082f49',
    cardBg: 'rgba(12, 74, 96, 0.75)',
    accent: '#38bdf8',
    text: '#f0f9ff',
    border: '#f59e0b'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-summer',
  previewStyle: {
    fontFamily: 'Inter, sans-serif',
    borderRadius: '16px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: '#f59e0b',
    headerBg: 'linear-gradient(90deg, #0284c7 0%, #f59e0b 100%)',
    cardBg: 'rgba(12, 74, 96, 0.85)',
    accentGlow: '0 0 16px rgba(56, 189, 248, 0.4)',
    badge: '☀️',
    decorIcons: ['☀️', '🌊', '🏝️']
  }
};
