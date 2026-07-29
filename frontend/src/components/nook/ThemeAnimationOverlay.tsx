import React from 'react';

interface ThemeAnimationOverlayProps {
  theme: string;
}

export const ThemeAnimationOverlay: React.FC<ThemeAnimationOverlayProps> = ({ theme }) => {
  if (!theme) return null;

  const normalizedTheme = theme.toLowerCase().trim();

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
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
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
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${10 + i * 18}%`,
              left: '-15%',
              fontSize: `${2 + (i % 2)}rem`,
              opacity: 0.45,
              animation: `cloudFloatRight ${18 + i * 5}s linear infinite`,
              animationDelay: `${i * 3}s`
            }}
          >
            ☁️
          </div>
        ))}
      </div>
    );
  }

  if (normalizedTheme === 'pixel-arcade' || normalizedTheme === 'theme-pixel-arcade') {
    return (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${15 + i * 14}%`,
              right: `${5 + (i * 16) % 80}%`,
              fontSize: '1.4rem',
              opacity: 0.3,
              animation: `pixelPulse 2s steps(2, start) infinite`,
              animationDelay: `${i * 0.4}s`
            }}
          >
            {i % 3 === 0 ? '👾' : i % 3 === 1 ? '🪙' : '❤️'}
          </div>
        ))}
      </div>
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
