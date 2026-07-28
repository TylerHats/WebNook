export interface PresetSticker {
  id: string;
  name: string;
  category: string;
  url: string;
}

export const PRESET_STICKERS: PresetSticker[] = [
  { id: 'sparkles', name: 'Sparkles', category: 'Effects', url: '✨' },
  { id: 'star_retro', name: 'Retro Star', category: 'Badges', url: '⭐' },
  { id: 'heart_pixel', name: 'Pixel Heart', category: 'Cute', url: '💖' },
  { id: 'vinyl_record', name: 'Vinyl Record', category: 'Music', url: '💽' },
  { id: 'cassette', name: 'Cassette Tape', category: 'Music', url: '📼' },
  { id: 'crown_gold', name: 'Gold Crown', category: 'Badges', url: '👑' },
  { id: 'fire', name: 'Fire Flame', category: 'Effects', url: '🔥' },
  { id: 'cat_cute', name: 'Cute Cat', category: 'Pets', url: '🐱' },
  { id: 'ghost_cute', name: 'Ghost', category: 'Cute', url: '👻' },
  { id: 'rainbow', name: 'Rainbow', category: 'Effects', url: '🌈' },
  { id: 'alien', name: 'Alien Pixel', category: 'Retro', url: '👾' },
  { id: 'gamepad', name: 'Gamepad', category: 'Gaming', url: '🎮' },
  { id: 'coffee', name: 'Cozy Coffee', category: 'Cozy', url: '☕' },
  { id: 'moon_crescent', name: 'Crescent Moon', category: 'Cozy', url: '🌙' },
  { id: 'cherry_blossom', name: 'Sakura Blossom', category: 'Cute', url: '🌸' }
];
