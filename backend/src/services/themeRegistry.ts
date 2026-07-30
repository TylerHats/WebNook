export interface BackendThemeMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  badge?: string;
  supportsSounds: boolean;
  supportsAnimations: boolean;
}

export const BACKEND_THEME_CATEGORIES = [
  { id: 'general', label: 'General', icon: '✨' },
  { id: 'retro', label: 'Retro', icon: '📼' },
  { id: 'cute_cozy', label: 'Cute & Cozy', icon: '🐾' },
  { id: 'futuristic', label: 'Futuristic', icon: '⚡' },
  { id: 'seasonal', label: 'Seasonal', icon: '❄️' }
];

export const BACKEND_THEMES: BackendThemeMeta[] = [
  { id: 'glassmorphism', name: 'Modern Glass', category: 'general', description: 'Frosted glass with dark blurred backdrops', badge: '✨', supportsSounds: false, supportsAnimations: false },
  { id: 'win9x', name: 'Win9X Classic', category: 'retro', description: 'Classic 90s teal desktop with animated file transfers & bevels', badge: '💻', supportsSounds: true, supportsAnimations: true },
  { id: 'frutiger-aero', name: 'Frutiger Aero (Win 7)', category: 'retro', description: 'Glossy Windows 7 glass with aqua blue sky gradients', badge: '💧', supportsSounds: false, supportsAnimations: false },
  { id: 'pixel-arcade', name: '8-Bit Pixel Arcade', category: 'retro', description: 'Blocky 3D offset pixel borders with retro arcade bleeps', badge: '👾', supportsSounds: true, supportsAnimations: true },
  { id: 'cat-cafe', name: 'Cozy Cat Café', category: 'cute_cozy', description: 'Warm peach & cream with dashed pink borders & paw prints', badge: '🐾', supportsSounds: true, supportsAnimations: true },
  { id: 'cloud-dream', name: 'Fluffy Cloud Dream', category: 'cute_cozy', description: 'Organic bubbly cloud corners with sky blue gradient', badge: '☁️', supportsSounds: true, supportsAnimations: true },
  { id: 'magical-girl', name: 'Magical Girl Kawaii', category: 'cute_cozy', description: 'Pastel pink & gold scalloped borders with star sparkles', badge: '✨', supportsSounds: true, supportsAnimations: true },
  { id: 'pastel', name: 'Y2K Retro Pastel', category: 'cute_cozy', description: 'Warm soft pinks and playful pastel accents', badge: '🎀', supportsSounds: false, supportsAnimations: false },
  { id: 'coffee', name: 'Cozy Coffee', category: 'cute_cozy', description: 'Warm amber tones and dark roasts', badge: '☕', supportsSounds: false, supportsAnimations: false },
  { id: 'velvet', name: 'Midnight Velvet', category: 'cute_cozy', description: 'Deep violet, plum and glowing amethysts', badge: '🌙', supportsSounds: false, supportsAnimations: false },
  { id: 'synthwave', name: 'Synthwave Neon', category: 'futuristic', description: 'Neon magenta glow with synthwave purples', badge: '🌆', supportsSounds: true, supportsAnimations: false },
  { id: 'cyberpunk', name: 'Cyberpunk Y2K', category: 'futuristic', description: 'Neon laser sweep borders & electric spark pulses', badge: '⚡', supportsSounds: true, supportsAnimations: true },
  { id: 'seasonal-winter', name: 'Winter Wonderland', category: 'seasonal', description: 'Cozy frosty ice blues & snowy white cards', badge: '❄️', supportsSounds: false, supportsAnimations: false },
  { id: 'christmas', name: 'Cozy Christmas Eve', category: 'seasonal', description: 'Festive pine green & holly red with snowy frosted panels & sleigh bell sounds', badge: '🎄', supportsSounds: true, supportsAnimations: true },
  { id: 'hanukkah', name: 'Festival of Lights (Hanukkah)', category: 'seasonal', description: 'Royal sapphire blue & metallic gold shimmer with glowing Menorah spark chimes', badge: '🕎', supportsSounds: true, supportsAnimations: true },
  { id: 'halloween', name: 'Spooky Halloween Night', category: 'seasonal', description: 'Midnight obsidian & pumpkin orange with eerie violet glow & haunting synth creaks', badge: '🎃', supportsSounds: true, supportsAnimations: true },
  { id: 'spring', name: 'Spring Blossom', category: 'seasonal', description: 'Sakura blossom pink & meadow green with floating petals & windchime audio', badge: '🌸', supportsSounds: true, supportsAnimations: true },
  { id: 'summer', name: 'Tropical Summer Sun', category: 'seasonal', description: 'Ocean turquoise & warm golden sand with sunburst reflections & tropical wave surge', badge: '☀️', supportsSounds: true, supportsAnimations: true },
  { id: 'autumn', name: 'Autumn Harvest & Leaves', category: 'seasonal', description: 'Deep maple crimson, burnt orange & amber with falling leaves & leaf rustle acoustic clicks', badge: '🍁', supportsSounds: true, supportsAnimations: true },
  { id: 'win11', name: 'Fluent OS', category: 'retro', description: 'Mica translucent slate panels, soft rounded 16px corners & Fluent UI startup chime', badge: '🪟', supportsSounds: true, supportsAnimations: true },
  { id: 'discord', name: 'Gamer Dark', category: 'general', description: 'Dark charcoal chat interface with iconic Blurple accents & gamer ping notification audio', badge: '💬', supportsSounds: true, supportsAnimations: true },
  { id: 'liquid-glass', name: 'Liquid Crystal Glass', category: 'general', description: 'Ultra-pure glossy liquid glassmorphism with iridescent specular highlights & ripple pops', badge: '💧', supportsSounds: true, supportsAnimations: true },
  { id: 'material-expressive', name: 'Material You Expressive', category: 'general', description: 'Android Material 3 Expressive pill shapes, tonal pastel palettes & haptic pop feedback', badge: '🎨', supportsSounds: true, supportsAnimations: true }
];
