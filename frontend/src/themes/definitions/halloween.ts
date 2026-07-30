import { ThemeDefinition } from '../types';

export const halloweenTheme: ThemeDefinition = {
  id: 'halloween',
  name: 'Spooky Halloween Night',
  category: 'seasonal',
  description: 'Midnight obsidian & pumpkin orange with eerie violet glow & haunting synth creaks',
  badge: '🎃',
  palette: {
    bg: '#0f051d',
    cardBg: 'rgba(30, 10, 50, 0.75)',
    accent: '#f97316',
    text: '#f3e8ff',
    border: '#a855f7'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-halloween',
  previewStyle: {
    fontFamily: 'Inter, sans-serif',
    borderRadius: '14px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: '#a855f7',
    headerBg: 'linear-gradient(90deg, #7e22ce 0%, #ea580c 100%)',
    cardBg: 'rgba(30, 10, 50, 0.85)',
    accentGlow: '0 0 18px rgba(249, 115, 22, 0.5)',
    badge: '🎃',
    decorIcons: ['🎃', '🦇', '👻']
  }
};
