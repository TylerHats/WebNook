import { ThemeDefinition } from '../types';

export const velvetTheme: ThemeDefinition = {
  id: 'velvet',
  name: 'Midnight Velvet',
  category: 'cute_cozy',
  description: 'Deep violet, plum tones, and glowing amethyst highlights',
  badge: '🌙',
  palette: {
    bg: '#09090b',
    cardBg: '#18181b',
    accent: '#a855f7',
    text: '#fafafa',
    border: '#3f3f46'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-velvet',
  previewStyle: {
    fontFamily: "'Playfair Display', serif",
    borderRadius: '16px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'rgba(192, 132, 252, 0.42)',
    headerBg: 'linear-gradient(135deg, #581c87 0%, #a855f7 100%)',
    cardBg: '#181028',
    accentGlow: '0 0 15px rgba(168, 85, 247, 0.45)',
    badge: '🌙',
    decorIcons: ['🌙', '🔮', '✨']
  },
  defaultCardTitles: {
    bio: 'Moonlit Bio',
    music: 'Nocturne Vinyls',
    friends: 'Inner Circle',
    hobbies: 'Evening Passions',
    movies: 'Late Night Screenings',
    books: 'Velvet Library',
    steam: 'Midnight Games'
  }
};
