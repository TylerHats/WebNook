import React, { useState, useEffect } from 'react';
import { playCyberpunkSparkBurst } from '../../utils/themeSoundEngine';

interface ThemeAnimationOverlayProps {
  theme: string;
}

export const ThemeAnimationOverlay: React.FC<ThemeAnimationOverlayProps> = ({ theme }) => {
  const [clickPaws, setClickPaws] = useState<{ id: number; x: number; y: number }[]>([]);
  const [clickCoins, setClickCoins] = useState<{ id: number; x: number; y: number }[]>([]);
  const [cyberSparks, setCyberSparks] = useState<{ id: number; top: string; left: string; particles: { vx: number; vy: number; size: number; color: string; delay: number; duration: number }[] }[]>([]);

  const normalizedTheme = theme ? theme.toLowerCase().trim() : '';

  useEffect(() => {
    let lastMousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const handleWindowClick = (e: MouseEvent) => {
      lastMousePos = { x: e.clientX, y: e.clientY };

      if (normalizedTheme === 'cat-cafe' || normalizedTheme === 'theme-cat-cafe') {
        const newPaw = { id: Date.now() + Math.random(), x: e.clientX, y: e.clientY };
        setClickPaws(prev => [...prev.slice(-15), newPaw]);
        setTimeout(() => setClickPaws(prev => prev.filter(p => p.id !== newPaw.id)), 1800);
      }
    };

    const handleThemeSound = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail?.sound === 'coin') {
        const posX = customEv.detail?.x !== undefined ? customEv.detail.x : lastMousePos.x;
        const posY = customEv.detail?.y !== undefined ? customEv.detail.y : lastMousePos.y;
        const newCoin = { id: Date.now() + Math.random(), x: posX, y: posY };
        setClickCoins(prev => [...prev.slice(-15), newCoin]);
        setTimeout(() => setClickCoins(prev => prev.filter(c => c.id !== newCoin.id)), 1400);
      }
    };

    window.addEventListener('click', handleWindowClick);
    window.addEventListener('webnook-theme-sound', handleThemeSound);

    return () => {
      window.removeEventListener('click', handleWindowClick);
      window.removeEventListener('webnook-theme-sound', handleThemeSound);
    };
  }, [normalizedTheme]);

  useEffect(() => {
    if (normalizedTheme !== 'cyberpunk' && normalizedTheme !== 'theme-cyberpunk') return;

    const triggerSparkShower = () => {
      const corners = [
        { top: '12%', left: '8%' },
        { top: '16%', left: '48%' },
        { top: '20%', left: '92%' },
        { top: '48%', left: '6%' },
        { top: '52%', left: '52%' },
        { top: '58%', left: '94%' },
        { top: '82%', left: '10%' },
        { top: '85%', left: '88%' }
      ];
      const chosen = corners[Math.floor(Math.random() * corners.length)];
      const colors = ['#ffe600', '#ffff33', '#ffd700', '#ffffff'];

      // Generate 32 neon yellow spark particles with smooth continuous arc physics
      const particles = Array.from({ length: 32 }, () => {
        const vx = (Math.random() - 0.5) * 240; // Horizontal drift (-120px to +120px)
        const vy = 90 + Math.random() * 250;    // Continuous fluid downward trajectory (+90px to +340px)
        const size = 2.5 + Math.random() * 4.5;
        const delay = Math.random() * 0.25;
        const duration = 1.1 + Math.random() * 0.5;
        return {
          vx,
          vy,
          size,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay,
          duration
        };
      });

      const newSpark = { id: Date.now() + Math.random(), ...chosen, particles };
      setCyberSparks(prev => [...prev.slice(-3), newSpark]);

      playCyberpunkSparkBurst();

      setTimeout(() => {
        setCyberSparks(prev => prev.filter(s => s.id !== newSpark.id));
      }, 2200);
    };

    // Organic interval (~9.5s)
    const interval = setInterval(triggerSparkShower, 9500);
    const initTimer = setTimeout(triggerSparkShower, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(initTimer);
    };
  }, [normalizedTheme]);

  if (!theme) return null;

  if (normalizedTheme === 'win98' || normalizedTheme === 'win95' || normalizedTheme === 'win9x' || normalizedTheme === 'theme-win98' || normalizedTheme === 'theme-win9x') {
    return (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
        {/* Windows 9X Floating Desktop Elements */}
        <div style={{ position: 'absolute', top: '15%', left: '4%', opacity: 0.15, fontSize: '2rem', animation: 'win9xIconFloat 8s ease-in-out infinite' }}>💻</div>
        <div style={{ position: 'absolute', top: '45%', right: '5%', opacity: 0.15, fontSize: '2rem', animation: 'win9xIconFloat 10s ease-in-out infinite 2s' }}>🗑️</div>
        <div style={{ position: 'absolute', bottom: '20%', left: '6%', opacity: 0.15, fontSize: '2rem', animation: 'win9xIconFloat 9s ease-in-out infinite 4s' }}>🌐</div>
        <div style={{ position: 'absolute', top: '75%', right: '8%', opacity: 0.15, fontSize: '2rem', animation: 'win9xIconFloat 11s ease-in-out infinite 1s' }}>☎️</div>
      </div>
    );
  }

  if (normalizedTheme === 'cyberpunk' || normalizedTheme === 'theme-cyberpunk') {
    return (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
        {cyberSparks.map(spark => (
          <div
            key={spark.id}
            style={{
              position: 'absolute',
              top: spark.top,
              left: spark.left,
              pointerEvents: 'none'
            }}
          >
            {/* Flash point core */}
            <div
              style={{
                position: 'absolute',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 0 20px #ffe600, 0 0 35px #ffff33',
                transform: 'translate(-50%, -50%)',
                animation: 'pawDropFade 0.45s ease-out forwards'
              }}
            />
            {/* Neon Yellow Spark Particles */}
            {spark.particles.map((p, pIdx) => (
              <div
                key={pIdx}
                style={{
                  position: 'absolute',
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  borderRadius: '50%',
                  backgroundColor: p.color,
                  boxShadow: `0 0 10px ${p.color}, 0 0 4px #ffffaa`,
                  transform: 'translate(-50%, -50%)',
                  '--vx': `${p.vx}px`,
                  '--vy': `${p.vy}px`,
                  animation: `cyberpunkSparkRain ${p.duration}s cubic-bezier(0.15, 0.75, 0.4, 1) ${p.delay}s forwards`
                } as React.CSSProperties}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (normalizedTheme === 'cat-cafe' || normalizedTheme === 'theme-cat-cafe') {
    const risingCats = [
      { icon: '🐾', left: '8%', size: '1.4rem', speed: '7s', delay: '-1s' },
      { icon: '🐱', left: '22%', size: '1.8rem', speed: '9.5s', delay: '-4.2s' },
      { icon: '☕', left: '37%', size: '1.3rem', speed: '6.8s', delay: '-2.5s' },
      { icon: '🧁', left: '52%', size: '1.5rem', speed: '8.2s', delay: '-5.8s' },
      { icon: '🐈', left: '66%', size: '1.7rem', speed: '10.5s', delay: '-1.8s' },
      { icon: '🐾', left: '81%', size: '1.4rem', speed: '7.5s', delay: '-3.6s' },
      { icon: '🎀', left: '93%', size: '1.3rem', speed: '9s', delay: '-6.5s' },
      { icon: '🐱', left: '14%', size: '1.6rem', speed: '11s', delay: '-8s' },
      { icon: '☕', left: '46%', size: '1.5rem', speed: '8.6s', delay: '-0.5s' },
      { icon: '🐾', left: '74%', size: '1.8rem', speed: '7.8s', delay: '-4.8s' }
    ];

    return (
      <>
        {/* Layer 1: Ambient randomized rising background elements (Behind Cards) */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
          {risingCats.map((cat, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                bottom: '-10%',
                left: cat.left,
                fontSize: cat.size,
                opacity: 0.38,
                animation: `floatUpDrift ${cat.speed} linear infinite`,
                animationDelay: cat.delay
              }}
            >
              {cat.icon}
            </div>
          ))}
        </div>

        {/* Layer 999: Floating click pawprints */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
          {clickPaws.map(paw => (
            <div
              key={paw.id}
              style={{
                position: 'fixed',
                left: paw.x - 14,
                top: paw.y - 14,
                fontSize: '1.6rem',
                pointerEvents: 'none',
                animation: 'pawDropFade 1.8s ease-out forwards'
              }}
            >
              🐾
            </div>
          ))}
        </div>
      </>
    );
  }

  if (normalizedTheme === 'cloud-dream' || normalizedTheme === 'theme-cloud-dream') {
    return (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
        {[...Array(8)].map((_, i) => {
          const width = 60 + (i % 4) * 22;
          const topPos = 4 + i * 11;
          const duration = 20 + (i % 4) * 7;
          const delay = i * 2.8;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${topPos}%`,
                left: '-25%',
                opacity: 0.95,
                filter: 'drop-shadow(0 8px 18px rgba(2, 132, 199, 0.45))',
                animation: `cloudFloatRight ${duration}s linear infinite`,
                animationDelay: `-${delay}s`
              }}
            >
              <svg width={width} height={width * 0.55} viewBox="0 0 100 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M18 42 C8 42 3 32 12 25 C8 15 22 8 35 15 C42 6 62 6 68 15 C78 7 92 14 88 25 C96 32 92 42 80 42 Z"
                  fill="#ffffff"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                />
                <path d="M26 22 C32 16 42 16 48 22" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
                <path d="M52 19 C60 14 70 15 74 21" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
                <path d="M18 32 C25 28 32 30 36 34" stroke="#e0f2fe" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
          );
        })}
      </div>
    );
  }

  if (normalizedTheme === 'pixel-arcade' || normalizedTheme === 'theme-pixel-arcade') {
    const retroElements = [
      { icon: '👾', top: '8%', left: '3%', opacity: 0.45, delay: '0s' },
      { icon: '🪙', top: '18%', left: '88%', opacity: 0.4, delay: '0.4s' },
      { icon: '❤️', top: '35%', left: '2%', opacity: 0.45, delay: '1.2s' },
      { icon: '🕹️', top: '55%', left: '92%', opacity: 0.35, delay: '0.8s' },
      { icon: '🍄', top: '72%', left: '4%', opacity: 0.5, delay: '1.6s' },
      { icon: '⭐️', top: '88%', left: '89%', opacity: 0.45, delay: '0.2s' },
      { icon: '👾', top: '12%', left: '78%', opacity: 0.4, delay: '1.4s' },
      { icon: '🪙', top: '48%', left: '5%', opacity: 0.45, delay: '0.6s' },
      { icon: '🕹️', top: '82%', left: '12%', opacity: 0.35, delay: '1.8s' },
      { icon: '❤️', top: '25%', left: '94%', opacity: 0.45, delay: '0.3s' },
      { icon: '🍄', top: '65%', left: '87%', opacity: 0.4, delay: '1.1s' },
      { icon: '⭐️', top: '42%', left: '91%', opacity: 0.5, delay: '0.9s' },
      { icon: '👾', top: '92%', left: '75%', opacity: 0.4, delay: '1.5s' },
      { icon: '🪙', top: '5%', left: '18%', opacity: 0.35, delay: '0.7s' },
      { icon: '❤️', top: '95%', left: '32%', opacity: 0.4, delay: '1.3s' },
      { icon: '🕹️', top: '3%', left: '82%', opacity: 0.45, delay: '0.5s' }
    ];

    return (
      <>
        {/* Layer 1: Behind Cards Ambient 8-Bit Retro Icons */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
          {retroElements.map((item, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: item.top,
                left: item.left,
                fontSize: i % 2 === 0 ? '1.6rem' : '1.3rem',
                opacity: item.opacity,
                animation: 'pixelPulse 2s steps(2, start) infinite',
                animationDelay: item.delay
              }}
            >
              {item.icon}
            </div>
          ))}
        </div>

        {/* Layer 999: Floating Click Mario Coins */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
          {clickCoins.map(coin => (
            <div
              key={coin.id}
              style={{
                position: 'fixed',
                left: coin.x - 14,
                top: coin.y - 14,
                fontSize: '1.6rem',
                pointerEvents: 'none',
                animation: 'marioCoinPop 1.4s cubic-bezier(0.25, 1, 0.5, 1) forwards'
              }}
            >
              🪙
            </div>
          ))}
        </div>
      </>
    );
  }

  if (normalizedTheme === 'magical-girl' || normalizedTheme === 'theme-magical-girl') {
    const magicalItems = [
      { icon: '✨', top: '7%', left: '4%', opacity: 0.6, delay: '0s', scale: '1.3rem' },
      { icon: '🌙', top: '15%', left: '88%', opacity: 0.55, delay: '1.2s', scale: '1.7rem' },
      { icon: '🪄', top: '32%', left: '5%', opacity: 0.5, delay: '0.5s', scale: '1.5rem' },
      { icon: '🌸', top: '55%', left: '92%', opacity: 0.45, delay: '1.8s', scale: '1.4rem' },
      { icon: '💖', top: '74%', left: '3%', opacity: 0.5, delay: '0.8s', scale: '1.5rem' },
      { icon: '👑', top: '86%', left: '87%', opacity: 0.55, delay: '2.1s', scale: '1.6rem' },
      { icon: '🎀', top: '18%', left: '76%', opacity: 0.45, delay: '1.4s', scale: '1.4rem' },
      { icon: '🔮', top: '48%', left: '6%', opacity: 0.5, delay: '0.3s', scale: '1.5rem' },
      { icon: '⭐️', top: '82%', left: '12%', opacity: 0.6, delay: '1.6s', scale: '1.3rem' },
      { icon: '✨', top: '27%', left: '93%', opacity: 0.55, delay: '0.9s', scale: '1.4rem' },
      { icon: '🌸', top: '64%', left: '86%', opacity: 0.45, delay: '2.4s', scale: '1.5rem' },
      { icon: '💖', top: '42%', left: '91%', opacity: 0.5, delay: '1.1s', scale: '1.3rem' },
      { icon: '🌙', top: '92%', left: '72%', opacity: 0.55, delay: '0.2s', scale: '1.6rem' },
      { icon: '🪄', top: '6%', left: '22%', opacity: 0.5, delay: '1.7s', scale: '1.4rem' },
      { icon: '🎀', top: '94%', left: '38%', opacity: 0.45, delay: '0.6s', scale: '1.5rem' },
      { icon: '✨', top: '4%', left: '83%', opacity: 0.6, delay: '1.3s', scale: '1.4rem' }
    ];

    return (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
        {magicalItems.map((item, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: item.top,
              left: item.left,
              fontSize: item.scale,
              opacity: item.opacity,
              animation: `sparkleShimmer 2.8s ease-in-out infinite alternate`,
              animationDelay: item.delay
            }}
          >
            {item.icon}
          </div>
        ))}
      </div>
    );
  }

  return null;
};
