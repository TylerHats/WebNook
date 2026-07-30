export type ThemeCategory = 'general' | 'retro' | 'cute_cozy' | 'futuristic' | 'seasonal';

export interface ThemePalette {
  bg: string;
  cardBg: string;
  accent: string;
  text: string;
  border: string;
}

export interface ThemePreviewStyle {
  fontFamily?: string;
  borderRadius?: string;
  borderStyle?: string;
  borderWidth?: string;
  borderColor?: string;
  headerBg?: string;
  cardBg?: string;
  accentGlow?: string;
  badge?: string;
  decorIcons?: string[];
}

export interface ThemeDefinition {
  id: string;
  name: string;
  category: ThemeCategory;
  description: string;
  badge?: string;
  palette: ThemePalette;
  supportsSounds: boolean;
  supportsAnimations: boolean;
  soundPreset?: 'win9x' | 'cat-cafe' | 'pixel-arcade' | 'cloud-dream' | 'magical-girl' | 'cyberpunk' | 'none';
  animationPreset?: 'win9x' | 'cat-cafe' | 'cloud-dream' | 'pixel-arcade' | 'magical-girl' | 'cyberpunk' | 'none';
  cssClass: string;
  previewStyle: ThemePreviewStyle;
  defaultCardTitles?: Record<string, string>;
}

export interface CategoryInfo {
  id: ThemeCategory;
  label: string;
  icon: string;
  description: string;
}
