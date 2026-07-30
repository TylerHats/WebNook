import { ThemeDefinition } from '../types';

export const seasonalWinterTheme: ThemeDefinition = {
  id: 'seasonal-winter',
  name: 'Winter Wonderland',
  category: 'seasonal',
  description: 'Cozy frosty ice blues, snowy white cards and crystalline silver accents',
  badge: '❄️',
  palette: {
    bg: '#0f172a',
    cardBg: 'rgba(30, 41, 59, 0.85)',
    accent: '#38bdf8',
    text: '#f8fafc',
    border: '#7dd3fc'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-seasonal-winter',
  previewStyle: {
    borderRadius: '20px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: '#7dd3fc',
    headerBg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    cardBg: 'rgba(30, 41, 59, 0.9)',
    accentGlow: '0 0 15px rgba(56, 189, 248, 0.5)',
    badge: '❄️',
    decorIcons: ['❄️', '⛄']
  }
};
