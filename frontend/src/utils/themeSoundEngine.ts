// WebNook Web Audio API Theme Sound Synthesizer
// Synthesizes retro button clicks, 8-bit arcade blips, cat purr pops, and magical chimes dynamically in browser!

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Windows 9x Classic Bevel Button Click
 */
export function playWin9xClick() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.05);

  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

/**
 * Windows 9x Classic Guestbook Dialup Startup Chime
 */
export function playWin9xGuestbook() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

    gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + idx * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + idx * 0.08);
    osc.stop(ctx.currentTime + idx * 0.08 + 0.3);
  });
}

/**
 * Cozy Cat Cafe Soft Bubble Pop Click
 */
export function playCatCafeClick() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.06);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.06);
}

/**
 * Cute Cat Meow Pitch-Bend Synthesizer
 */
export function playCatCafeMeow() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';

  const t = ctx.currentTime;
  osc.frequency.setValueAtTime(550, t);
  osc.frequency.linearRampToValueAtTime(880, t + 0.12);
  osc.frequency.exponentialRampToValueAtTime(380, t + 0.38);

  gain.gain.setValueAtTime(0.01, t);
  gain.gain.linearRampToValueAtTime(0.18, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.4);
}

/**
 * Cozy Cat Cafe Warm Purr Tone
 */
export function playCatCafePurr() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.15);
  osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.3);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

/**
 * 8-Bit Pixel Arcade Jump/Blip
 */
export function playPixelArcadeClick() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.08);

  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.08);
}

/**
 * 8-Bit Retro Coin Pickup Chime
 */
export function playPixelCoin() {
  const ctx = getAudioContext();
  if (!ctx) return;
  [987.77, 1318.51].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + idx * 0.08);
    osc.stop(ctx.currentTime + idx * 0.08 + 0.18);
  });
}

/**
 * Fluffy Cloud Dream Soft Cushion Pop
 */
export function playCloudDreamPop() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(480, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.07);

  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.07);
}

/**
 * Magical Girl Kawaii Shimmering Sparkle Chime
 */
export function playMagicalChime() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);

    gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.05);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.05 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + idx * 0.05);
    osc.stop(ctx.currentTime + idx * 0.05 + 0.25);
  });
}

/**
 * Cyberpunk Electric Zap Pulse
 */
export function playCyberpunkSpark() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

/**
 * Main Sound Dispatcher for Themes
 */
export function playThemeSound(
  themeId: string,
  isSoundEnabled: boolean = true,
  action: 'click' | 'guestbook' | 'action' = 'click',
  coords?: { x: number; y: number }
) {
  if (!isSoundEnabled) return;

  const t = themeId || 'glassmorphism';

  if (t === 'win98' || t === 'win9x') {
    if (action === 'guestbook') playWin9xGuestbook();
    else playWin9xClick();
  } else if (t === 'cat-cafe') {
    if (action === 'guestbook') playCatCafePurr();
    else {
      if (Math.random() < 0.25) {
        playCatCafeMeow();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('webnook-theme-sound', { detail: { theme: 'cat-cafe', sound: 'meow', x: coords?.x, y: coords?.y } }));
        }
      } else {
        playCatCafeClick();
      }
    }
  } else if (t === 'pixel-arcade') {
    if (action === 'guestbook') {
      playPixelCoin();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('webnook-theme-sound', { detail: { theme: 'pixel-arcade', sound: 'coin', x: coords?.x, y: coords?.y } }));
      }
    } else {
      if (Math.random() < 0.25) {
        playPixelCoin();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('webnook-theme-sound', { detail: { theme: 'pixel-arcade', sound: 'coin', x: coords?.x, y: coords?.y } }));
        }
      } else {
        playPixelArcadeClick();
      }
    }
  } else if (t === 'cloud-dream') {
    playCloudDreamPop();
  } else if (t === 'magical-girl') {
    playMagicalChime();
  } else if (t === 'cyberpunk' || t === 'synthwave') {
    playCyberpunkSpark();
  }
}
