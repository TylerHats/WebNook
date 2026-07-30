import { ThemeDefinition } from '../types';

export const velvetTheme: ThemeDefinition = {
  id: 'velvet',
  name: 'Midnight Velvet',
  category: 'cute_cozy',
  description: 'Deep violet, plum tones, and glowing amethyst highlights',
  badge: '🌙',
  palette: {
    bg: '#09090b',
    cardBg: '#18181b',
    accent: '#a855f7',
    text: '#fafafa',
    border: '#3f3f46'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-velvet',
  previewStyle: {
    borderRadius: '16px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#3f3f46',
    headerBg: 'linear-gradient(135deg, #581c87 0%, #a855f7 100%)',
    cardBg: '#18181b',
    accentGlow: '0 0 15px rgba(168, 85, 247, 0.4)',
    badge: '🌙'
  }
};
