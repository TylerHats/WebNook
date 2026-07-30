import { ThemeDefinition } from '../types';

export const coffeeTheme: ThemeDefinition = {
  id: 'coffee',
  name: 'Cozy Coffee',
  category: 'cute_cozy',
  description: 'Warm amber tones, espresso roasts, and rich dark chocolate accents',
  badge: '☕',
  palette: {
    bg: '#1c1917',
    cardBg: '#292524',
    accent: '#d97706',
    text: '#f5f5f4',
    border: '#78350f'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-coffee',
  previewStyle: {
    borderRadius: '14px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#78350f',
    headerBg: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
    cardBg: '#292524',
    badge: '☕'
  }
};
