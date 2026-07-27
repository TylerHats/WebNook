import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Palette, Sparkles, Image, Music, Eye, Code, Plus, Trash2, Save } from 'lucide-react';
import { Sticker } from '../components/nook/StickerCanvas';

const PRESET_STICKERS = [
  'https://cdn-icons-png.flaticon.com/512/744/744922.png', // Sparkle star
  'https://cdn-icons-png.flaticon.com/512/2589/2589175.png', // Cute heart
  'https://cdn-icons-png.flaticon.com/512/3075/3075977.png', // Retro cassette
  'https://cdn-icons-png.flaticon.com/512/4359/4359963.png', // Cute cat
  'https://cdn-icons-png.flaticon.com/512/616/616408.png' // Pixel ghost
];

export const NookCustomizerPage: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [theme, setTheme] = useState('glassmorphism');
  const [visibilityNook, setVisibilityNook] = useState('private');
  const [bgColor, setBgColor] = useState('#12131C');
  const [accentColor, setAccentColor] = useState('#6366f1');
  const [bgMusicUrl, setBgMusicUrl] = useState('');
  const [bgMusicTitle, setBgMusicTitle] = useState('');
  const [customCss, setCustomCss] = useState('');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetch(`/api/nook/profile/${user.username}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.nookSettings) {
            setTheme(data.nookSettings.theme || 'glassmorphism');
            setVisibilityNook(data.nookSettings.visibility_nook || 'private');
            setBgColor(data.nookSettings.bg_color || '#12131C');
            setAccentColor(data.nookSettings.accent_color || '#6366f1');
            setBgMusicUrl(data.nookSettings.bg_music_url || '');
            setBgMusicTitle(data.nookSettings.bg_music_title || '');
            setCustomCss(data.nookSettings.custom_css || '');
          }
          if (data.stickers) {
            setStickers(data.stickers);
          }
        })
        .catch(err => console.error(err));
    }
  }, [user, token]);

  const handleAddSticker = (url: string) => {
    const newSticker: Sticker = {
      sticker_url: url,
      pos_x: Math.floor(Math.random() * 60) + 10,
      pos_y: Math.floor(Math.random() * 60) + 10,
      scale: 1.0,
      rotation: Math.floor(Math.random() * 30) - 15
    };
    setStickers([...stickers, newSticker]);
    showToast('Sticker added to canvas!', 'info');
  };

  const handleRemoveSticker = (index: number) => {
    setStickers(stickers.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);

    try {
      // Save Nook Customization
      const custRes = await fetch('/api/nook/customization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          theme,
          visibility_nook: visibilityNook,
          bg_color: bgColor,
          accent_color: accentColor,
          bg_music_url: bgMusicUrl,
          bg_music_title: bgMusicTitle,
          custom_css: customCss
        })
      });

      // Save Stickers
      const stickRes = await fetch('/api/nook/stickers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ stickers })
      });

      if (custRes.ok && stickRes.ok) {
        showToast('Nook customized successfully!', 'success');
      } else {
        showToast('Failed to save customization', 'error');
      }
    } catch (e) {
      showToast('Error saving customization', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Login Required</h2>
        <p>Please log in to customize your Nook.</p>
      </div>
    );
  }

  return (
    <div className={`theme-${theme}`} style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={28} />
              <span>Nook Visual Studio & Customizer</span>
            </h1>
            <p style={{ opacity: 0.7 }}>Design your dream page with cute themes, audio, stickers, and custom CSS.</p>
          </div>
          <button onClick={handleSave} className="btn-primary" disabled={isSaving}>
            <Save size={18} />
            <span>{isSaving ? 'Saving...' : 'Save Nook'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Theme Selector */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Sparkles size={20} />
              <span>Choose Nook Theme</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {[
                { id: 'glassmorphism', name: 'Modern Glass', desc: 'Vibrant dark frosted glass with blurred backdrops' },
                { id: 'win98', name: 'Retro Windows 98', desc: 'Classic 90s OS chrome, 3D borders & blue titlebars' },
                { id: 'frutiger-aero', name: 'Frutiger Aero', desc: 'Windows 7 glossy gradients & aqua highlights' },
                { id: 'cyberpunk', name: 'Cyberpunk Y2K', desc: 'High-contrast dark synthwave & neon magenta glow' }
              ].map(t => (
                <div
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    border: theme === t.id ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    background: theme === t.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, lineHeight: 1.4 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Nook Privacy Controls */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Eye size={20} />
              <span>Nook Visibility & Privacy</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[
                { id: 'private', label: '🔒 Private (Default - Friends Only Access)' },
                { id: 'public', label: '🌐 Public (Anyone can view)' }
              ].map(opt => (
                <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.id}
                    checked={visibilityNook === opt.id}
                    onChange={e => setVisibilityNook(e.target.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Background Audio Settings */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Music size={20} />
              <span>Background Anthem Audio</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Audio Title</label>
                <input
                  type="text"
                  placeholder="e.g. My Favorite Song"
                  value={bgMusicTitle}
                  onChange={e => setBgMusicTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>MP3 Direct Audio URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/song.mp3"
                  value={bgMusicUrl}
                  onChange={e => setBgMusicUrl(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
            </div>
          </div>

          {/* Cute Stickers & Badges Layer */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Image size={20} />
              <span>Stickers & Badges Overlay</span>
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '1rem' }}>
              Click preset stickers to place them on your Nook profile!
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              {PRESET_STICKERS.map((st, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAddSticker(st)}
                  style={{ background: 'rgba(255,255,255,0.08)', padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}
                >
                  <img src={st} alt="preset" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                </button>
              ))}
            </div>

            {stickers.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Active Canvas Stickers ({stickers.length}):</h4>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {stickers.map((st, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.25)', padding: '0.4rem 0.6rem', borderRadius: '8px' }}>
                      <img src={st.sticker_url} alt="st" style={{ width: '24px', height: '24px' }} />
                      <span style={{ fontSize: '0.75rem' }}>Sticker #{idx + 1}</span>
                      <Trash2 size={14} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => handleRemoveSticker(idx)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Custom CSS Editor */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Code size={20} />
              <span>Custom CSS Overrides</span>
            </div>
            <textarea
              rows={5}
              placeholder="/* Inject custom CSS rules for your Nook! */&#10;.nook-panel { border-color: #ff007f; }"
              value={customCss}
              onChange={e => setCustomCss(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                borderRadius: 'var(--border-radius-btn)',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                color: '#22c55e'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
