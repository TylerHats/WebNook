import React, { useState, useEffect } from 'react';

interface ThemeAnimationOverlayProps {
  theme: string;
}

export const ThemeAnimationOverlay: React.FC<ThemeAnimationOverlayProps> = ({ theme }) => {
  const [clickPaws, setClickPaws] = useState<{ id: number; x: number; y: number }[]>([]);
  const [clickCoins, setClickCoins] = useState<{ id: number; x: number; y: number }[]>([]);

  const normalizedTheme = theme ? theme.toLowerCase().trim() : '';

  useEffect(() => {
    let handleWindowClick: ((e: MouseEvent) => void) | null = null;

    if (normalizedTheme === 'cat-cafe' || normalizedTheme === 'theme-cat-cafe') {
      handleWindowClick = (e: MouseEvent) => {
        const newPaw = { id: Date.now() + Math.random(), x: e.clientX, y: e.clientY };
        setClickPaws(prev => [...prev.slice(-15), newPaw]);
        setTimeout(() => setClickPaws(prev => prev.filter(p => p.id !== newPaw.id)), 1800);
      };
    } else if (normalizedTheme === 'pixel-arcade' || normalizedTheme === 'theme-pixel-arcade') {
      handleWindowClick = (e: MouseEvent) => {
        // Sync coin visual pop with 25% coin sound trigger in themeSoundEngine.ts
        if (Math.random() >= 0.25) return;
        const newCoin = { id: Date.now() + Math.random(), x: e.clientX, y: e.clientY };
        setClickCoins(prev => [...prev.slice(-15), newCoin]);
        setTimeout(() => setClickCoins(prev => prev.filter(c => c.id !== newCoin.id)), 1400);
      };
    }

    if (!handleWindowClick) return;

    const activeHandler = handleWindowClick;
    window.addEventListener('click', activeHandler);
    return () => {
      window.removeEventListener('click', activeHandler);
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
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: '2px', height: '40px', background: '#ff007f', boxShadow: '0 0 10px #ff007f', animation: 'cyberSpark 2s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '60%', right: '12%', width: '2px', height: '60px', background: '#00f3ff', boxShadow: '0 0 10px #00f3ff', animation: 'cyberSpark 3s ease-in-out infinite 1s' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '30%', width: '3px', height: '30px', background: '#ffe600', boxShadow: '0 0 12px #ffe600', animation: 'cyberSpark 2.5s ease-in-out infinite 1.5s' }} />
      </div>
    );
  }

  if (normalizedTheme === 'cat-cafe' || normalizedTheme === 'theme-cat-cafe') {
    return (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
        {/* Floating click pawprints */}
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

        {/* Ambient rising background elements */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: '-10%',
              left: `${15 + i * 15}%`,
              fontSize: i % 2 === 0 ? '1.4rem' : '1.8rem',
              opacity: 0.35,
              animation: `floatUpDrift ${6 + (i % 4) * 2}s linear infinite`,
              animationDelay: `${i * 1.2}s`
            }}
          >
            {i % 3 === 0 ? '🐾' : i % 3 === 1 ? '🐱' : '☕'}
          </div>
        ))}
      </div>
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
    return (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${8 + i * 11}%`,
              left: `${8 + (i * 12) % 85}%`,
              fontSize: '1.3rem',
              opacity: 0.5,
              animation: `sparkleShimmer 2.5s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.3}s`
            }}
          >
            {i % 3 === 0 ? '✨' : i % 3 === 1 ? '🌙' : '🪄'}
          </div>
        ))}
      </div>
    );
  }

  return null;
};
