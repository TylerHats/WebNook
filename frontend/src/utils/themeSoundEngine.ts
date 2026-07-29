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
 * Cute & Soft Kitten Meow Synthesizer
 */
export function playCatCafeMeow() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'triangle';

  // High-pitched cute kitten frequency sweep ("m-e-o-w~")
  // Starts ~680Hz ("m"), glides up to ~1120Hz ("meee"), gently drops to ~600Hz ("ow~")
  osc1.frequency.setValueAtTime(680, t);
  osc1.frequency.linearRampToValueAtTime(1120, t + 0.12);
  osc1.frequency.exponentialRampToValueAtTime(600, t + 0.36);

  osc2.frequency.setValueAtTime(684, t);
  osc2.frequency.linearRampToValueAtTime(1126, t + 0.12);
  osc2.frequency.exponentialRampToValueAtTime(604, t + 0.36);

  // Soft low-pass filter to smooth out all harshness
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1600, t);
  filter.frequency.linearRampToValueAtTime(2200, t + 0.12);
  filter.frequency.exponentialRampToValueAtTime(1200, t + 0.36);

  // Soft, gentle volume envelope
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(t);
  osc2.start(t);

  const stopTime = t + 0.39;
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
 * Synthesize Crisp Cyberpunk Electrical Spark Crackle
 */
export function playCyberpunkSpark() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  // Highpass electrical crackle noise burst
  const bufferSize = Math.floor(ctx.sampleRate * 0.12);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(2400, t);
  filter.frequency.exponentialRampToValueAtTime(6500, t + 0.1);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

  // Electrical pitch zap
  const zapOsc = ctx.createOscillator();
  const zapGain = ctx.createGain();
  zapOsc.type = 'sawtooth';
  zapOsc.frequency.setValueAtTime(2800, t);
  zapOsc.frequency.exponentialRampToValueAtTime(350, t + 0.07);

  zapGain.gain.setValueAtTime(0.12, t);
  zapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  zapOsc.connect(zapGain);
  zapGain.connect(ctx.destination);

  noise.start(t);
  zapOsc.start(t);
  noise.stop(t + 0.12);
  zapOsc.stop(t + 0.08);
}

/**
 * Synthesize Fireworks / Arc Discharge Spark Shower Sound Effect
 */
export function playCyberpunkSparkBurst() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  // Staggered crackle noise burst
  const bufferSize = Math.floor(ctx.sampleRate * 0.35);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const decay = Math.exp(-i / (bufferSize * 0.4));
    const crackle = Math.random() > 0.85 ? (Math.random() * 2 - 1) : 0;
    data[i] = ((Math.random() * 2 - 1) * 0.4 + crackle * 0.6) * decay;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(3200, t);
  filter.frequency.exponentialRampToValueAtTime(1200, t + 0.32);
  filter.Q.setValueAtTime(2.5, t);

  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0.22, t);
  mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);

  // Cascading metallic arc whistling sweeps (fireworks sizzle)
  [0, 0.05, 0.12].forEach((offset, idx) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(3500 - idx * 600, t + offset);
    osc.frequency.exponentialRampToValueAtTime(220 + idx * 80, t + offset + 0.18);

    g.gain.setValueAtTime(0.1, t + offset);
    g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.18);

    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t + offset);
    osc.stop(t + offset + 0.19);
  });

  noise.connect(filter);
  filter.connect(mainGain);
  mainGain.connect(ctx.destination);

  noise.start(t);
  noise.stop(t + 0.35);
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
