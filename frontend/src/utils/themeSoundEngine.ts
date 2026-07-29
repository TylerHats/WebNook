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
 * Realistic Vocal Formant Cat Meow Synthesizer
 */
export function playCatCafeMeow() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  // Primary vocal cord oscillator (sawtooth for rich harmonic spectrum)
  const osc1 = ctx.createOscillator();
  // Secondary harmonic overtone oscillator (sine at 1.5x formant freq)
  const osc2 = ctx.createOscillator();
  // Vibrato sub-oscillator (6.5 Hz waver)
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  // Resonant vocal tract BiquadFilter (peaking filter for vocal formant)
  const filter = ctx.createBiquadFilter();
  const mainGain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc2.type = 'sine';
  lfo.type = 'sine';

  // LFO vibrato setup (6.5 Hz modulation)
  lfo.frequency.setValueAtTime(6.5, t);
  lfoGain.gain.setValueAtTime(14, t);
  lfo.connect(osc1.frequency);
  lfo.connect(osc2.frequency);

  // Vowel pitch envelope ("m-e-o-w")
  osc1.frequency.setValueAtTime(360, t);
  osc1.frequency.linearRampToValueAtTime(740, t + 0.14);
  osc1.frequency.exponentialRampToValueAtTime(390, t + 0.42);

  osc2.frequency.setValueAtTime(540, t);
  osc2.frequency.linearRampToValueAtTime(1110, t + 0.14);
  osc2.frequency.exponentialRampToValueAtTime(585, t + 0.42);

  // Formant Filter sweep (mimics opening cat mouth "m" -> "me-o" -> "w")
  filter.type = 'peaking';
  filter.Q.setValueAtTime(3.5, t);
  filter.gain.setValueAtTime(8, t);
  filter.frequency.setValueAtTime(500, t);
  filter.frequency.linearRampToValueAtTime(1200, t + 0.14);
  filter.frequency.exponentialRampToValueAtTime(450, t + 0.42);

  // Dynamic vocal volume envelope
  mainGain.gain.setValueAtTime(0.001, t);
  mainGain.gain.linearRampToValueAtTime(0.18, t + 0.06);
  mainGain.gain.linearRampToValueAtTime(0.15, t + 0.22);
  mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.44);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(mainGain);
  mainGain.connect(ctx.destination);

  lfo.start(t);
  osc1.start(t);
  osc2.start(t);

  const stopTime = t + 0.45;
  lfo.stop(stopTime);
  osc1.stop(stopTime);
  osc2.stop(stopTime);
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
