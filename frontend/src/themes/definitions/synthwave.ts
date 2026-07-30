import { ThemeDefinition } from '../types';

export const synthwaveTheme: ThemeDefinition = {
  id: 'synthwave',
  name: 'Synthwave Neon',
  category: 'futuristic',
  description: 'Neon magenta glow with synthwave purples and electric cyan accents',
  badge: '🌆',
  palette: {
    bg: '#0d0221',
    cardBg: '#190b34',
    accent: '#ff007f',
    text: '#00f5d4',
    border: '#ff007f'
  },
  supportsSounds: true,
  supportsAnimations: false,
  soundPreset: 'cyberpunk',
  animationPreset: 'none',
  cssClass: 'theme-synthwave',
  previewStyle: {
    borderRadius: '12px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#ff007f',
    headerBg: 'linear-gradient(90deg, #ff007f 0%, #7b2cbf 100%)',
    cardBg: '#190b34',
    accentGlow: '0 0 15px rgba(255, 0, 127, 0.6)',
    badge: '🌆'
  }
};
