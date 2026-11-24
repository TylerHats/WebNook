import { ThemeDefinition } from '../types';

export const cloudDreamTheme: ThemeDefinition = {
  id: 'cloud-dream',
  name: 'Fluffy Cloud Dream',
  category: 'cute_cozy',
  description: 'Organic bubbly cloud corners with sky blue gradient and drifting cloud animations',
  badge: '☁️',
  palette: {
    bg: '#e0f2fe',
    cardBg: 'rgba(255, 255, 255, 0.9)',
    accent: '#3b82f6',
    text: '#0f172a',
    border: '#bae6fd'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'cloud-dream',
  animationPreset: 'cloud-dream',
  cssClass: 'theme-cloud-dream',
  previewStyle: {
    fontFamily: "'Fredoka', sans-serif",
    borderRadius: '24px 12px 24px 12px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: '#7dd3fc',
    headerBg: 'linear-gradient(135deg, #60a5fa 0%, #38bdf8 100%)',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    badge: '☁️',
    decorIcons: ['☁️', '🎈']
  },
  defaultCardTitles: {
    bio: 'Daydream Bio',
    music: 'Skyward Lo-Fi Beats',
    friends: 'Cloud Companions',
    hobbies: 'Floaty Pastimes',
    movies: 'Sunday Sky Films',
    books: 'Softcover Shelf',
    steam: 'Cozy Sky Adventures'
  }
};
