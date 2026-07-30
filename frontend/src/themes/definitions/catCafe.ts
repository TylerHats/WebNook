import { ThemeDefinition } from '../types';

export const catCafeTheme: ThemeDefinition = {
  id: 'cat-cafe',
  name: 'Cozy Cat Café',
  category: 'cute_cozy',
  description: 'Warm peach & cream with dashed pink borders, floating pawprints, meows & purrs',
  badge: '🐾',
  palette: {
    bg: '#fbf4eb',
    cardBg: '#fffbf7',
    accent: '#f43f5e',
    text: '#431407',
    border: '#fbcfe8'
  },
  supportsSounds: true,
  supportsAnimations: true,
  soundPreset: 'cat-cafe',
  animationPreset: 'cat-cafe',
  cssClass: 'theme-cat-cafe',
  previewStyle: {
    borderRadius: '20px',
    borderStyle: 'dashed',
    borderWidth: '2px',
    borderColor: '#f472b6',
    headerBg: 'linear-gradient(135deg, #fbcfe8 0%, #ffe4e6 100%)',
    cardBg: '#fffbf7',
    badge: '🐾',
    decorIcons: ['🐾', '🐱', '☕']
  }
};
