import { ThemeDefinition } from '../types';

export const frutigerAeroTheme: ThemeDefinition = {
  id: 'frutiger-aero',
  name: 'Frutiger Aero (Win 7)',
  category: 'retro',
  description: 'Glossy Windows 7 glass with aqua blue sky gradients and glassy buttons',
  badge: '💧',
  palette: {
    bg: '#1c3b6f',
    cardBg: 'rgba(255, 255, 255, 0.85)',
    accent: '#0080ff',
    text: '#0c2340',
    border: 'rgba(255, 255, 255, 0.9)'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-frutiger-aero',
  previewStyle: {
    fontFamily: "'Outfit', sans-serif",
    borderRadius: '16px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: '#ffffff',
    headerBg: 'linear-gradient(180deg, #66b2ff 0%, #0078d7 100%)',
    cardBg: 'rgba(255, 255, 255, 0.88)',
    accentGlow: '0 4px 15px rgba(0, 128, 255, 0.4)',
    badge: '💧',
    decorIcons: ['💧', '🫧', '🌊']
  },
  defaultCardTitles: {
    bio: 'Aero User Profile',
    music: 'Media Player 12',
    friends: 'Messenger Contacts',
    hobbies: 'Desktop Gadgets',
    movies: 'Video Library',
    books: 'Digital Reader',
    steam: 'Games Explorer'
  }
};
