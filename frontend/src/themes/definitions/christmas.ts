import { ThemeDefinition } from '../types';

export const christmasTheme: ThemeDefinition = {
  id: 'christmas',
  name: 'Cozy Christmas Eve',
  category: 'seasonal',
  description: 'Festive pine green & holly red with snowy frosted panels & sleigh bell sounds',
  badge: '🎄',
  palette: {
    bg: '#064e3b',
    cardBg: 'rgba(15, 23, 42, 0.78)',
    accent: '#dc2626',
    text: '#ffffff',
    border: '#f59e0b'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-christmas',
  previewStyle: {
    fontFamily: 'Inter, sans-serif',
    borderRadius: '16px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: '#f59e0b',
    headerBg: 'linear-gradient(90deg, #064e3b 0%, #dc2626 100%)',
    cardBg: 'rgba(15, 23, 42, 0.85)',
    accentGlow: '0 0 16px rgba(220, 38, 38, 0.4)',
    badge: '🎄',
    decorIcons: ['🎄', '❄️', '🎁']
  }
};
