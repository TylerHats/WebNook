import { ThemeDefinition, CategoryInfo, ThemeCategory } from './types';
import { glassmorphismTheme } from './definitions/glassmorphism';
import { win9xTheme } from './definitions/win9x';
import { frutigerAeroTheme } from './definitions/frutigerAero';
import { catCafeTheme } from './definitions/catCafe';
import { cloudDreamTheme } from './definitions/cloudDream';
import { pixelArcadeTheme } from './definitions/pixelArcade';
import { magicalGirlTheme } from './definitions/magicalGirl';
import { synthwaveTheme } from './definitions/synthwave';
import { cyberpunkTheme } from './definitions/cyberpunk';
import { pastelTheme } from './definitions/pastel';
import { coffeeTheme } from './definitions/coffee';
import { velvetTheme } from './definitions/velvet';
import { seasonalWinterTheme } from './definitions/seasonalWinter';
import { christmasTheme } from './definitions/christmas';
import { hanukkahTheme } from './definitions/hanukkah';
import { halloweenTheme } from './definitions/halloween';
import { springTheme } from './definitions/spring';
import { summerTheme } from './definitions/summer';
import { autumnTheme } from './definitions/autumn';
import { win11Theme } from './definitions/win11';
import { discordTheme } from './definitions/discord';
import { liquidGlassTheme } from './definitions/liquidGlass';
import { materialExpressiveTheme } from './definitions/materialExpressive';

export const THEME_CATEGORIES: CategoryInfo[] = [
  {
    id: 'general',
    label: 'General',
    icon: '✨',
    description: 'Clean, modern, liquid glass & Material UI baseline styles'
  },
  {
    id: 'retro',
    label: 'Retro',
    icon: '📼',
    description: 'Nostalgic 90s OS desktops, Windows 11 glass, 8-bit arcade pixels & aero glass'
  },
  {
    id: 'cute_cozy',
    label: 'Cute & Cozy',
    icon: '🐾',
    description: 'Warm peach cafes, fluffy clouds, magical girl sparkles & coffees'
  },
  {
    id: 'futuristic',
    label: 'Futuristic',
    icon: '⚡',
    description: 'High-voltage neon, cyberpunk grids & synthwave vibes'
  },
  {
    id: 'seasonal',
    label: 'Seasonal',
    icon: '❄️',
    description: 'Christmas, Hanukkah, Halloween, Spring, Summer, Fall & Winter presets'
  }
];

export const ALL_THEMES: ThemeDefinition[] = [
  glassmorphismTheme,
  win9xTheme,
  win11Theme,
  discordTheme,
  liquidGlassTheme,
  materialExpressiveTheme,
  frutigerAeroTheme,
  catCafeTheme,
  cloudDreamTheme,
  pixelArcadeTheme,
  magicalGirlTheme,
  synthwaveTheme,
  cyberpunkTheme,
  pastelTheme,
  coffeeTheme,
  velvetTheme,
  seasonalWinterTheme,
  christmasTheme,
  hanukkahTheme,
  halloweenTheme,
  springTheme,
  summerTheme,
  autumnTheme
];

export const getThemeById = (id: string): ThemeDefinition => {
  const norm = (id || '').toLowerCase().trim();
  if (norm === 'win98') return win9xTheme;
  return ALL_THEMES.find(t => t.id.toLowerCase() === norm) || glassmorphismTheme;
};

export const getThemesByCategory = (category: ThemeCategory): ThemeDefinition[] => {
  return ALL_THEMES.filter(t => t.category === category);
};

export const getCategoryForTheme = (themeId: string): ThemeCategory => {
  const theme = getThemeById(themeId);
  return theme ? theme.category : 'general';
};
