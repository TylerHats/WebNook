import { ThemeDefinition } from '../types';

export const magicalGirlTheme: ThemeDefinition = {
  id: 'magical-girl',
  name: 'Magical Girl Kawaii',
  category: 'cute_cozy',
  description: 'Pastel pink & gold scalloped double borders with shimmering star chimes & sparkles',
  badge: '✨',
  palette: {
    bg: '#fff0f6',
    cardBg: '#fff8fa',
    accent: '#ec4899',
    text: '#831843',
    border: '#facc15'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'magical-girl',
  animationPreset: 'magical-girl',
  cssClass: 'theme-magical-girl',
  previewStyle: {
    borderRadius: '18px',
    borderStyle: 'double',
    borderWidth: '3px',
    borderColor: '#f472b6',
    headerBg: 'linear-gradient(135deg, #f472b6 0%, #facc15 100%)',
    cardBg: '#fff8fa',
    badge: '✨',
    decorIcons: ['✨', '🌙', '🪄']
  }
};
