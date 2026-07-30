import { ThemeDefinition } from '../types';

export const pixelArcadeTheme: ThemeDefinition = {
  id: 'pixel-arcade',
  name: '8-Bit Pixel Arcade',
  category: 'retro',
  description: 'Blocky offset 3D pixel borders with arcade bleeps, jump blips & floating coins',
  badge: '👾',
  palette: {
    bg: '#0c051a',
    cardBg: '#190a38',
    accent: '#ff007f',
    text: '#00ffcc',
    border: '#ff007f'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'pixel-arcade',
  animationPreset: 'pixel-arcade',
  cssClass: 'theme-pixel-arcade',
  previewStyle: {
    fontFamily: 'monospace',
    borderRadius: '0px',
    borderStyle: 'solid',
    borderWidth: '3px',
    borderColor: '#ff007f',
    headerBg: '#ff007f',
    cardBg: '#190a38',
    accentGlow: '4px 4px 0px #00ffcc',
    badge: '👾',
    decorIcons: ['👾', '🪙', '🍄']
  }
};
