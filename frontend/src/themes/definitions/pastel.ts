import { ThemeDefinition } from '../types';

export const pastelTheme: ThemeDefinition = {
  id: 'pastel',
  name: 'Y2K Retro Pastel',
  category: 'cute_cozy',
  description: 'Warm soft pinks and playful pastel accents with rounded bubbly borders',
  badge: '🎀',
  palette: {
    bg: '#fef2f2',
    cardBg: '#ffffff',
    accent: '#ec4899',
    text: '#1f2937',
    border: '#f472b6'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-pastel',
  previewStyle: {
    borderRadius: '24px',
    borderStyle: 'dashed',
    borderWidth: '2px',
    borderColor: '#f472b6',
    headerBg: 'linear-gradient(135deg, #fbcfe8 0%, #f472b6 100%)',
    cardBg: '#ffffff',
    badge: '🎀'
  }
};
