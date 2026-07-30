import { ThemeDefinition } from '../types';

export const discordTheme: ThemeDefinition = {
  id: 'discord',
  name: 'Gamer Dark',
  category: 'general',
  description: 'Dark charcoal chat interface with iconic Blurple accents & gamer ping notification audio',
  badge: '💬',
  palette: {
    bg: '#1e1f22',
    cardBg: '#2b2d31',
    accent: '#5865f2',
    text: '#f2f3f5',
    border: '#383a40'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-discord',
  previewStyle: {
    fontFamily: "'gg sans', 'Noto Sans', sans-serif",
    borderRadius: '12px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#383a40',
    headerBg: '#2b2d31',
    cardBg: '#2b2d31',
    accentGlow: '0 4px 20px rgba(88, 101, 242, 0.4)',
    badge: '💬',
    decorIcons: ['💬', '🟢', '🎮']
  },
  defaultCardTitles: {
    bio: '#about-me',
    music: '#music-lounge',
    movies: '#movie-night',
    hobbies: '#hobbies-chat',
    friends: '#top-friends',
    books: '#reading-nook',
    steam: '#steam-showcase',
    guestbook: '#guestbook-messages'
  }
};
