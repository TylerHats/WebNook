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
  supportsAnimations: true,
  soundPreset: 'cyberpunk',
  animationPreset: 'cyberpunk',
  cssClass: 'theme-synthwave',
  previewStyle: {
    fontFamily: "'Space Grotesk', sans-serif",
    borderRadius: '12px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: '#f43f5e',
    headerBg: 'linear-gradient(90deg, #ff2a85 0%, #f97316 55%, #7b2cbf 100%)',
    cardBg: '#1a0a38',
    accentGlow: '0 0 15px rgba(255, 42, 133, 0.6)',
    badge: '🌆',
    decorIcons: ['🌆', '🌴', '💿']
  },
  defaultCardTitles: {
    bio: 'Neon Driver Bio',
    music: 'Outrun Cassette Deck',
    friends: 'Nightcruise Crew',
    hobbies: 'Synth & Arcade',
    movies: 'Midnight VHS Picks',
    books: 'Retro Sci-Fi Shelf',
    steam: 'Cyber Arcade Scores'
  }
};
