import { ThemeDefinition } from '../types';

export const win11Theme: ThemeDefinition = {
  id: 'win11',
  name: 'Fluent OS',
  category: 'retro',
  description: 'Mica translucent slate panels, soft rounded 16px corners & Fluent UI startup chime',
  badge: '🪟',
  palette: {
    bg: '#0f172a',
    cardBg: 'rgba(30, 41, 59, 0.65)',
    accent: '#0284c7',
    text: '#f8fafc',
    border: 'rgba(255, 255, 255, 0.15)'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-win11',
  previewStyle: {
    fontFamily: "'Segoe UI Variable', 'Segoe UI', sans-serif",
    borderRadius: '16px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    headerBg: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
    cardBg: 'rgba(30, 41, 59, 0.75)',
    accentGlow: '0 8px 32px rgba(2, 132, 199, 0.35)',
    badge: '🪟',
    decorIcons: ['🪟', '✨']
  }
};
