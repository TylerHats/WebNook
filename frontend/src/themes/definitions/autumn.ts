import { ThemeDefinition } from '../types';

export const autumnTheme: ThemeDefinition = {
  id: 'autumn',
  name: 'Autumn Harvest & Leaves',
  category: 'seasonal',
  description: 'Deep maple crimson, burnt orange & amber with falling leaves & leaf rustle acoustic clicks',
  badge: '🍁',
  palette: {
    bg: '#2d140a',
    cardBg: 'rgba(67, 24, 12, 0.8)',
    accent: '#ea580c',
    text: '#ffedd5',
    border: '#f59e0b'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-autumn',
  previewStyle: {
    fontFamily: 'Inter, sans-serif',
    borderRadius: '16px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: '#f59e0b',
    headerBg: 'linear-gradient(90deg, #991b1b 0%, #ea580c 100%)',
    cardBg: 'rgba(67, 24, 12, 0.85)',
    accentGlow: '0 0 16px rgba(234, 88, 12, 0.4)',
    badge: '🍁',
    decorIcons: ['🍁', '🍂', '🌾']
  }
};
