# Themes & Customization Guide

WebNook features **23 handcrafted themes** organized into five bookshelf categories, plus deep customization controls for colors, card geometry, glass blur, glow, patterns, typography, and sanitized custom CSS.

## Theme Bookshelves (23 Themes)

- **General:** Modern Glass (`glassmorphism`), Gamer Dark (`discord`), Liquid Crystal Glass (`liquid-glass`), Material You Expressive (`material-expressive`)
- **Retro:** Win9X Classic (`win9x`), Frutiger Aero Win 7 (`frutiger-aero`), 8-Bit Pixel Arcade (`pixel-arcade`), Fluent OS (`win11`)
- **Cute & Cozy:** Cozy Cat Café (`cat-cafe`), Fluffy Cloud Dream (`cloud-dream`), Magical Girl Kawaii (`magical-girl`), Y2K Retro Pastel (`pastel`), Cozy Coffee (`coffee`), Midnight Velvet (`velvet`)
- **Futuristic:** Cyberpunk Y2K (`cyberpunk`), Synthwave Neon (`synthwave`)
- **Seasonal:** Winter Wonderland (`seasonal-winter`), Cozy Christmas Eve (`christmas`), Festival of Lights (`hanukkah`), Spooky Halloween Night (`halloween`), Spring Blossom (`spring`), Tropical Summer Sun (`summer`), Autumn Harvest (`autumn`)

## 5-Channel Palette & Style Pop Overrides

Inside **Customizer → Choose Nook Theme & Color Palettes**, you can customize:
1. **5 Color Pickers:** Base Background, Card Panel Surface, Accent Highlight, Main Text Color, and Card Border Color — with a **Reset to Theme Defaults** button to snap back cleanly to the selected theme's palette.
2. **Style & Pop Overrides:**
   - **Corner Shape:** `Theme Default`, `Sharp (2px)`, `Soft (10px)`, `Rounded (20px)`, `Expressive Pill (28px)`
   - **Backdrop Glass Blur:** `Theme Default`, `Crisp / No Blur`, `Subtle (8px)`, `Medium Frost (18px)`, `Heavy Crystal (30px)`
   - **Panel Accent Glow:** `Theme Default`, `Flat / No Glow`, `Soft Ambient Halo`, `Vibrant Neon Pop`
   - **Background Pattern:** `Theme Default`, `Solid / Clean`, `Polka Dot Matrix`, `Blueprint Grid`, `CRT Scanlines`, `Starfield Sparkle`, `Retro Diagonal Stripes`
   - **Typography Override:** `Outfit`, `Space Grotesk`, `Fredoka`, `Playfair Display`, `JetBrains Mono`, `VT323`, `Press Start 2P`
3. **Theme Sound Effects & Micro-Animations:** Every theme supports toggleable Web Audio sound feedback and non-blocking ambient overlays (`prefers-reduced-motion` is respected automatically).

## Custom Card Layout, Music & Custom HTML/CSS

- **Card Reordering & Custom Titles:** Reorder cards (`bio`, `music`, `friends`, `hobbies`, `movies`, `books`, `steam`, `markdown`, `html`), override titles per card, or toggle card visibility.
- **Music Playlists:** Upload audio files (`MP3`, `WAV`, `OGG`, `FLAC`, `M4A`, `AAC`, `OPUS`, `WEBM`, up to 50 MB; automatically transcoded to 44.1 kHz MP3 when `ffmpeg` is present) or link Spotify & Apple Music tracks. Clicking **Spotify** or **Apple Music** in the playback hint links directly to the web player.
- **Custom HTML & CSS Security:** Custom HTML cards and CSS overrides are sanitized both server-side and client-side to strip `<script>`, `<iframe>`, `<svg>`, inline `on*` handlers, `@import`, and `javascript:` URLs while preserving safe layout markup and inline styling.

