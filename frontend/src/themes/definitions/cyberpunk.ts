import { ThemeDefinition } from '../types';

export const cyberpunkTheme: ThemeDefinition = {
  id: 'cyberpunk',
  name: 'Cyberpunk Y2K',
  category: 'futuristic',
  description: 'Neon yellow pulse borders, electric spark crackles & high voltage arc showers',
  badge: '⚡',
  palette: {
    bg: '#050505',
    cardBg: '#121212',
    accent: '#facc15',
    text: '#00ffcc',
    border: '#facc15'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'cyberpunk',
  animationPreset: 'cyberpunk',
  cssClass: 'theme-cyberpunk',
  previewStyle: {
    borderRadius: '4px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: '#00f3ff',
    headerBg: 'linear-gradient(90deg, #ff007f 0%, #00f3ff 100%)',
    cardBg: 'rgba(20, 10, 35, 0.9)',
    accentGlow: '0 0 15px rgba(0, 243, 255, 0.7)',
    badge: '⚡'
  }
};
