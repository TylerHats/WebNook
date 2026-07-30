import { ThemeDefinition } from '../types';

export const glassmorphismTheme: ThemeDefinition = {
  id: 'glassmorphism',
  name: 'Modern Glass',
  category: 'general',
  description: 'Frosted glass with dark blurred backdrops and sleek indigo glows',
  badge: '✨',
  palette: {
    bg: '#12131C',
    cardBg: 'rgba(255, 255, 255, 0.06)',
    accent: '#6366f1',
    text: '#ffffff',
    border: 'rgba(255, 255, 255, 0.14)'
  },
  supportsSounds: false,
  supportsAnimations: false,
  soundPreset: 'none',
  animationPreset: 'none',
  cssClass: 'theme-glassmorphism',
  previewStyle: {
    borderRadius: '16px',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    headerBg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.2))',
    cardBg: 'rgba(255, 255, 255, 0.08)',
    accentGlow: '0 4px 15px rgba(99, 102, 241, 0.4)',
    badge: '✨'
  }
};
