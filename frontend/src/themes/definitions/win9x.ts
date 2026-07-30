import { ThemeDefinition } from '../types';

export const win9xTheme: ThemeDefinition = {
  id: 'win9x',
  name: 'Win9X Classic',
  category: 'retro',
  description: 'Classic 90s teal desktop with animated file transfers, bevels & click sounds',
  badge: '💻',
  palette: {
    bg: '#008080',
    cardBg: '#c0c0c0',
    accent: '#000080',
    text: '#000000',
    border: '#ffffff'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'win9x',
  animationPreset: 'win9x',
  cssClass: 'theme-win9x',
  previewStyle: {
    fontFamily: "'MS Sans Serif', Tahoma, sans-serif",
    borderRadius: '0px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: '#ffffff',
    headerBg: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
    cardBg: '#c0c0c0',
    badge: '💻',
    decorIcons: ['💻', '🗑️']
  },
  defaultCardTitles: {
    bio: '[BIO.TXT]',
    music: '[AUDIO_PLAYER.EXE]',
    movies: '[CINEMA.MPG]',
    hobbies: '[PASSIONS.LOG]',
    friends: '[TOP_FRIENDS.DLL]',
    books: '[LIBRARY.DOC]',
    steam: '[STEAM_GAMES.EXE]',
    guestbook: '[GUESTBOOK.HTM]'
  }
};
