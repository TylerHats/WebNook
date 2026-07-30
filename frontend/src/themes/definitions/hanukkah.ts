import { ThemeDefinition } from '../types';

export const hanukkahTheme: ThemeDefinition = {
  id: 'hanukkah',
  name: 'Festival of Lights (Hanukkah)',
  category: 'seasonal',
  description: 'Royal sapphire blue & metallic gold shimmer with glowing Menorah spark chimes',
  badge: '🕎',
  palette: {
    bg: '#0f172a',
    cardBg: 'rgba(30, 58, 138, 0.65)',
    accent: '#38bdf8',
    text: '#ffffff',
    border: '#facc15'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-hanukkah',
  previewStyle: {
    fontFamily: 'Inter, sans-serif',
    borderRadius: '16px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: '#facc15',
    headerBg: 'linear-gradient(90deg, #1d4ed8 0%, #0284c7 100%)',
    cardBg: 'rgba(30, 58, 138, 0.75)',
    accentGlow: '0 0 18px rgba(56, 189, 248, 0.4)',
    badge: '🕎',
    decorIcons: ['🕎', '✡️', '✨']
  }
};
